import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns";

// Render.com and Node.js v17+ often default to IPv6 (AAAA records) for DNS, 
// which causes ENETUNREACH errors on free tiers or restricted network egress configurations.
// This forces Node to use IPv4 to connect to Gmail's SMTP servers successfully.
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4, // Forces Nodemailer to resolve IPv4 addresses specifically (bypassing ENETUNREACH in Node 17+)
  connectionTimeout: 10000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify the transporter once on startup to catch misconfigurations early.
transporter.verify((err, success) => {
  if (err) {
    console.error("🚨 Email transporter verification failed:", err);
  } else {
    console.log("✅ Email transporter verified");
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    return await transporter.sendMail({
      from: `"Galacticos HR" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error("🚨 sendEmail failed:", err);
    throw err;
  }
};

export const sendSetPasswordEmail = async (email, name, token) => {
  const setPasswordUrl = `https://galacticos-traker.onrender.com/set-password?token=${token}`;
  const subject = "Welcome to Galacticos HR - Set Your Password";
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Welcome, ${name}!</h2>
      <p>An administrator has created an account for you on Galacticos HR.</p>
      <p>Please click the button below to set your password and access your account.</p>
      <a href="${setPasswordUrl}" style="display: inline-block; padding: 10px 20px; background-color: #14b8a6; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Set Password</a>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: <br/>${setPasswordUrl}</p>
    </div>
  `;
  await sendEmail(email, subject, html);
};

export const sendForgotPasswordEmail = async (email, name, token) => {
  const resetUrl = `https://galacticos-traker.onrender.com/reset-password?token=${token}`;
  const subject = "Galacticos Network - Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password.</p>
      <p>Click the button below to reset it. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #14b8a6; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Reset Password</a>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, ignore this email.<br/>Link: ${resetUrl}</p>
    </div>
  `;
  await sendEmail(email, subject, html);
};
