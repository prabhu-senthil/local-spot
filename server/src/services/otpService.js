import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

// Gmail SMTP configuration
// IMPORTANT: User needs to set GMAIL_USER and GMAIL_PASS (App Password) in .env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const generateOTP = () => {
  // Generate a 6-digit random number
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

export const verifyOTP = async (otp, hashedOTP) => {
  return bcrypt.compare(otp, hashedOTP);
};

export const sendOTPEmail = async (email, otp) => {
  console.log(`Attempting to send OTP to ${email}...`);
  // Fallback for development if credentials are not provided
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log("*************************************************");
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    console.log("*************************************************");
    return;
  }

  const mailOptions = {
    from: `"LocalSpot Verification" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your Restaurant Claim OTP",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Verify your Restaurant Ownership</h2>
        <p>You requested to claim a venue on LocalSpot. Please use the following One-Time Password (OTP) to complete the verification:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #6366f1; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br />
        <p>Best regards,<br />The LocalSpot Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    // In dev, we might still want to see the OTP even if mail fails
    console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
  }
};
