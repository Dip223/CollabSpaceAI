import nodemailer, { Transporter } from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";

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

let transporter: Transporter | null = null;

const getTransporter = () => {
  if (!smtpUser || !smtpPass) {
    throw new Error(
      "SMTP email service is not configured. Set SMTP_USER/SMTP_PASS (or EMAIL_USER/EMAIL_PASS)."
    );
  }

  if (transporter) return transporter;

  // `family` is a real, supported nodemailer/SMTPConnection option (forwarded to
  // Node's net.connect) but is missing from the currently installed @types/nodemailer.
  const options: SMTPPool.Options & { family?: number } = {
    pool: true,
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Render (and several other hosts) resolve smtp.gmail.com's AAAA record but can't
    // actually route IPv6 egress, so the socket just hangs until it times out.
    // Forcing IPv4 here is what actually fixes the "ETIMEDOUT" seen in Render logs.
    family: 4,
    maxConnections: 3,
    // Fail fast instead of hanging until the platform's own request timeout kicks in.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  };

  transporter = nodemailer.createTransport(options);

  return transporter;
};

// Verifies SMTP auth/connectivity once at boot so misconfiguration shows up
// immediately in the Render logs instead of on the first user's registration attempt.
export const verifyMailTransport = async () => {
  try {
    await getTransporter().verify();
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
  try {
    await getTransporter().sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error: any) {
    console.error(`SMTP email delivery failed for ${to}:`, error?.message || error);
    throw new Error(`Email delivery failed: ${error?.message || "Unknown SMTP error"}`);
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
