import nodemailer from "nodemailer";

function isLogOnlyMode() {
  return String(process.env.LOG_EMAIL_ONLY).toLowerCase() === "true";
}

export async function sendPasswordResetEmail(
  email,
  resetLink,
  { transporter, logger = console } = {}
) {
  if (isLogOnlyMode()) {
    logger.log(`Password reset link for ${email}: ${resetLink}`);
    return { logged: true };
  }

  const mailTransporter =
    transporter ||
    nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

  await mailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Password reset request",
    text: `Reset your password using this link: ${resetLink}`
  });

  return { logged: false };
}
