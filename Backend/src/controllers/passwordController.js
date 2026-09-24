import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

// ─── Nodemailer transporter ───────────────────────────────────────────────────

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new AppError("Vui lòng cung cấp email", 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select("+passwordResetToken +passwordResetExpires");

  // Luôn trả 200 để tránh user enumeration
  if (!user) {
    return res.status(200).json({
      message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
    });
  }

  // Tạo token ngẫu nhiên (32 bytes hex = 64 ký tự)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
  await user.save();

  // Build reset link
  const clientUrl = process.env.CLIENT_URL?.split(",")[0]?.trim() || "http://localhost:5173";
  const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

  // Gửi email
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Chat App" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Đặt lại mật khẩu - Chat App",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #0ea5e9; margin-bottom: 8px;">Đặt lại mật khẩu</h2>
          <p style="color: #475569;">Xin chào <strong>${user.displayName}</strong>,</p>
          <p style="color: #475569;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Link dưới đây có hiệu lực trong <strong>15 phút</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Nếu bạn không yêu cầu điều này, hãy bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #cbd5e1; font-size: 12px; text-align: center;">© 2025 Chat App</p>
        </div>
      `,
    });
  } catch (err) {
    // Rollback token nếu gửi email thất bại
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.error("SMTP error:", err);
    throw new AppError("Không thể gửi email. Vui lòng thử lại sau.", 500);
  }

  return res.status(200).json({
    message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
  });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new AppError("Token và mật khẩu mới là bắt buộc", 400);
  }

  if (password.length < 6) {
    throw new AppError("Mật khẩu phải có ít nhất 6 ký tự", 400);
  }

  // Hash token để so sánh với DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }, // chưa hết hạn
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw new AppError("Token không hợp lệ hoặc đã hết hạn", 400);
  }

  // Cập nhật mật khẩu
  user.hashedPassword = await bcrypt.hash(password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.status(200).json({ message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay." });
});
