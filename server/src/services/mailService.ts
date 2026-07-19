const brevoApiUrl = "https://api.brevo.com/v3/smtp/email";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: EmailPayload) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName =
    process.env.BREVO_SENDER_NAME || "CollabSpace AI";

  if (!apiKey || !senderEmail) {
    throw new Error(
      "Brevo email service is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL."
    );
  }

  const response = await fetch(brevoApiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Brevo email delivery failed (${response.status}): ${errorText}`
    );
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