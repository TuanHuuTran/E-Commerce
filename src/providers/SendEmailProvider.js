import nodemailer from 'nodemailer'
import { env } from '~/config/environment';


const transporter = nodemailer.createTransport({
  service: "gmail", // Dùng Gmail, có thể đổi sang SMTP khác
  auth: {
    user: env.EMAIL_USER, // Email gửi đi
    pass: env.EMAIL_PASS, // Mật khẩu ứng dụng
  },
});

const sendVerificationEmail = async (email, verifyToken) => {
  const verificationLink = `${env.SERVER_URL}/users/verify-account?token=${verifyToken}&email=${email}`;

  const mailOptions = {
    from: env.EMAIL_USER,
    to: email,
    subject: "Account Activation",
    html: `
      <h2>Welcome to our platform</h2>
      <p>Click the link below to activate your account:</p>
      <a href="${verificationLink}" target="_blank">Activate Account</a>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

export const SendEmailProvider = {
  sendVerificationEmail
}
