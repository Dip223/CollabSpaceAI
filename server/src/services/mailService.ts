import dns from "dns";
import nodemailer, { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
// Port 465 = implicit TLS. Port 587/25 = STARTTLS (secure must be false, nodemailer upgrades the connection itself).
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : smtpPort === 465;

// Falls back to the existing EMAIL_USER / EMAIL_PASS vars so no env changes are required on Render.
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

const senderName = process.env.EMAIL_FROM_NAME || "CollabSpace AI";
const senderEmail = process.env.EMAIL_FROM || smtpUser;

// Nodemailer does its OWN internal DNS resolution (dns.resolve4/resolve6) and
// ignores both the `family` transport option and Node's dns.setDefaultResultOrder.
// On Render, its internal IPv4 lookup for smtp.gmail.com fails while the IPv6
// lookup succeeds, so it connects to the AAAA address — which Render's network
// can't route (ENETUNREACH). Resolving the A record ourselves with dns.lookup
// (which Render *can* do reliably) and handing nodemailer the literal IPv4
// address sidesteps its resolver entirely.
const resolveIPv4 = (hostname: string): Promise<string | null> =>
  new Promise((resolve) => {
    dns.lookup(hostname, { family: 4 }, (err, address) => {
      if (err) {
        console.error(`IPv4 lookup for ${hostname} failed, falling back to hostname:`, err.message);
        return resolve(null);
      }
      resolve(address);
    });
  });

// Builds a fresh transporter (with a fresh IPv4 lookup) per call rather than
// caching one for the process lifetime. Gmail load-balances across several
// IPs, so a cached resolution could go stale mid-run; this app only sends
// occasional auth emails, so the extra DNS lookup (a few ms) is a non-issue.
const buildTransporter = async (): Promise<Transporter> => {
  if (!smtpUser || !smtpPass) {
    throw new Error(
      "SMTP email service is not configured. Set SMTP_USER/SMTP_PASS (or EMAIL_USER/EMAIL_PASS)."
    );
  }

  const resolvedIp = await resolveIPv4(smtpHost);

  // `servername` is a real, supported SMTPConnection option (used for TLS SNI /
  // certificate hostname validation) but is missing from the currently
  // installed @types/nodemailer, so it's added via an intersection type below.
  const options: SMTPTransport.Options & { servername?: string } = {
    host: resolvedIp || smtpHost,
    // Gmail's cert is issued for the hostname, not the IP, so SNI/cert checks
    // need the original hostname even when we connect to a literal IP.
    servername: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Fail fast instead of hanging until the platform's own request timeout kicks in.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  };

  return nodemailer.createTransport(options);
};

// Verifies SMTP auth/connectivity once at boot so misconfiguration shows up
// immediately in the Render logs instead of on the first user's registration attempt.
export const verifyMailTransport = async () => {
  try {
    const tx = await buildTransporter();
    await tx.verify();
    tx.close();
    console.log(`✅ SMTP ready (${smtpHost}:${smtpPort}, secure=${smtpSecure})`);
  } catch (error: any) {
    console.error(
      `⚠️  SMTP verification failed (${smtpHost}:${smtpPort}): ${error?.message || error}`
    );
  }
};

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const sendEmail = async ({ to, subject, text, html }: EmailPayload) => {
  const tx = await buildTransporter();

  try {
    await tx.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error: any) {
    console.error(`SMTP email delivery failed for ${to}:`, error?.message || error);
    throw new Error(`Email delivery failed: ${error?.message || "Unknown SMTP error"}`);
  } finally {
    tx.close();
  }
};

export const sendVerificationEmail = async (
  email: string,
  otp: string
) => {
  await sendEmail({
    to: email,
    subject: "Your CollabSpace AI verification code",
    text: `Your CollabSpace AI verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Verify your CollabSpace AI account</h2>
        <p>Enter this 6-digit code in the verification page:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#5865F2">
          ${otp}
        </p>
        <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  });
};

export const sendResetPasswordEmail = async (
  email: string,
  token: string
) => {
  const resetLink =
    `${process.env.CLIENT_URL}/reset-password/${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your CollabSpace AI password",
    text: `Reset your password: ${resetLink}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Reset Password</h2>
        <p>Click below to create a new password:</p>
        <a href="${resetLink}"
          style="display:inline-block;padding:12px 20px;background:#5865F2;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
      </div>
    `,
  });
};
