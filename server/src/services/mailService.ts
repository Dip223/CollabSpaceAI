import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= VERIFY EMAIL =================

export const sendVerificationEmail = async (
  email: string,
  token: string
) => {

  const verificationLink =
    `http://localhost:5000/api/auth/verify/${token}`;

  await transporter.sendMail({

    from: `"CollabSpace AI" <${process.env.EMAIL_USER}>`,

    to: email,

    subject: "Verify Your CollabSpace Account",

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">

        <h2>Welcome to CollabSpace AI 🎉</h2>

        <p>
          Thank you for creating an account.
        </p>

        <p>
          Please click the button below to verify your email.
        </p>

        <a
          href="${verificationLink}"
          style="
            display:inline-block;
            padding:12px 20px;
            background:#5865F2;
            color:#ffffff;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          "
        >
          Verify Email
        </a>

        <p style="margin-top:20px;">
          This verification link expires in
          <strong>24 hours</strong>.
        </p>

      </div>
    `,

  });

};

// ================= RESET PASSWORD =================

export const sendResetPasswordEmail = async (
  email: string,
  token: string
) => {

  const resetLink =
    `${process.env.CLIENT_URL}/reset-password/${token}`;

  await transporter.sendMail({

    from: `"CollabSpace AI" <${process.env.EMAIL_USER}>`,

    to: email,

    subject: "Reset Your CollabSpace Password",

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">

        <h2>Reset Password</h2>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          Click the button below to create a new password.
        </p>

        <a
          href="${resetLink}"
          style="
            display:inline-block;
            padding:12px 20px;
            background:#5865F2;
            color:#ffffff;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          "
        >
          Reset Password
        </a>

        <p style="margin-top:20px;">
          This link will expire in
          <strong>1 hour</strong>.
        </p>

        <p>
          If you didn't request this, you can safely ignore this email.
        </p>

      </div>
    `,

  });

};