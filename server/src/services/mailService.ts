import nodemailer from "nodemailer";

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Email service is not configured. Set EMAIL_USER and EMAIL_PASS."
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: true,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

    tls: {
      servername: process.env.SMTP_HOST || "smtp.gmail.com",
      minVersion: "TLSv1.2",
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

const sender = () =>
  process.env.EMAIL_FROM ||
  `"CollabSpace AI" <${process.env.EMAIL_USER}>`;

export const sendVerificationEmail = async (
  email: string,
  otp: string
) => {
  await getTransporter().sendMail({
    from: sender(),
    to: email,
    subject: "Your CollabSpace AI verification code",
    text: `Your CollabSpace AI verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Verify your CollabSpace AI account</h2>
        <p>Enter this code in the verification page:</p>
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

  await getTransporter().sendMail({
    from: sender(),
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