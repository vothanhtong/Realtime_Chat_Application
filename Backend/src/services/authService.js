import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { AppError } from "../utils/AppError.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { validateSignIn, validateSignUp, RESERVED_EMAIL_DOMAIN } from "../validators/index.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_MS } from "../config/constants.js";
import { disconnectUserSockets } from "../realtime/emitter.js";

/**
 * Authentication & account lifecycle. Transport-agnostic: returns tokens,
 * never touches req/res — the controller owns cookies.
 */

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
// Mỗi email chỉ nhận tối đa 1 thư đặt lại mật khẩu / phút (kể cả khi kẻ spam đổi IP)
const RESET_EMAIL_COOLDOWN_MS = 60 * 1000;
const RESET_MESSAGE =
  "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const clientUrl = () =>
  process.env.CLIENT_URL?.split(",")[0]?.trim() || "http://localhost:5173";

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

// ─── Tokens & sessions ────────────────────────────────────────────────────────

/** Short-lived JWT access token */
export const signAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

/** Persist a refresh-token session; returns the raw token for the cookie */
const createSession = async (userId) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  await Session.create({
    userId,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return refreshToken;
};

/** Access token + refresh session for a user */
const issueTokens = async (userId) => ({
  accessToken: signAccessToken(userId),
  refreshToken: await createSession(userId),
});

// ─── OAuth (Firebase) — account-linking rules (chống pre-account takeover) ───
//   1. Firebase UID đã liên kết → đăng nhập vào đúng tài khoản đó.
//   2. Token có email đã xác minh:
//        - chưa có tài khoản → tạo mới (emailVerified = true)
//        - tài khoản emailVerified = true → liên kết UID rồi đăng nhập
//        - tài khoản emailVerified = false → TỪ CHỐI gộp tự động (409): kẻ tấn
//          công có thể đã đăng ký trước bằng email nạn nhân; chủ email thật phải
//          chứng minh quyền sở hữu qua "Quên mật khẩu" trước.
//   3. Token không có email đã xác minh: Google → 401; GitHub → tài khoản với
//      email giữ chỗ <uid>@github.local, KHÔNG chiếm email thật chưa xác minh.

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  statusVisible: user.statusVisible,
});

const generateUsername = async (email, firebaseUid) => {
  let username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (await User.exists({ username })) {
    username = `${username}_${firebaseUid.slice(-4).toLowerCase()}`;
  }
  return username;
};

const createOAuthUser = async ({ email, emailVerified, displayName, avatarUrl, firebaseUid }) => {
  const username = await generateUsername(email, firebaseUid);
  return User.create({
    username,
    // Phải là bcrypt hash hợp lệ (bcrypt.compare sẽ throw với chuỗi sai format);
    // mật khẩu ngẫu nhiên, không ai biết.
    hashedPassword: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
    email,
    emailVerified,
    firebaseUids: [firebaseUid],
    displayName: displayName || username,
    avatarUrl: avatarUrl || undefined,
  });
};

const linkFirebaseUid = async (user, firebaseUid, avatarUrl) => {
  const update = { $addToSet: { firebaseUids: firebaseUid } };
  if (!user.avatarUrl && avatarUrl) update.$set = { avatarUrl };
  await User.updateOne({ _id: user._id }, update);
  if (update.$set) user.avatarUrl = avatarUrl;
};

const resolveOAuthUser = async (decodedToken, provider) => {
  const { uid, email, email_verified: emailVerified, name, picture } = decodedToken;

  const linked = await User.findOne({ firebaseUids: uid });
  if (linked) return linked;

  if (email && emailVerified) {
    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    if (!existing) {
      return createOAuthUser({
        email: normalizedEmail,
        emailVerified: true,
        displayName: name || normalizedEmail.split("@")[0],
        avatarUrl: picture,
        firebaseUid: uid,
      });
    }

    if (!existing.emailVerified) {
      throw new AppError(
        "Email này đã được đăng ký bằng mật khẩu nhưng chưa được xác minh. " +
          "Hãy đăng nhập bằng mật khẩu, hoặc dùng \"Quên mật khẩu\" để xác minh email, " +
          "sau đó mới đăng nhập được bằng " + (provider === "google" ? "Google" : "GitHub") + ".",
        409
      );
    }

    await linkFirebaseUid(existing, uid, picture);
    return existing;
  }

  if (provider === "google") throw new AppError("Email chưa được xác thực", 401);

  // GitHub không có email đã xác minh: email giữ chỗ gắn với UID (domain bị cấm ở signup)
  const placeholderEmail = `${uid.toLowerCase()}@${RESERVED_EMAIL_DOMAIN}`;
  const placeholderUser = await User.findOne({ email: placeholderEmail });
  if (placeholderUser) {
    await linkFirebaseUid(placeholderUser, uid, picture);
    return placeholderUser;
  }

  return createOAuthUser({
    email: placeholderEmail,
    emailVerified: false,
    displayName: name || "GitHub User",
    avatarUrl: picture,
    firebaseUid: uid,
  });
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const authService = {
  async signUp(body) {
    validateSignUp(body);
    const { username, password, email, firstName, lastName } = body;
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    const [duplicateUsername, duplicateEmail] = await Promise.all([
      User.exists({ username: normalizedUsername }),
      User.exists({ email: normalizedEmail }),
    ]);
    if (duplicateUsername) throw new AppError("Username đã tồn tại", 409);
    if (duplicateEmail) throw new AppError("Email đã được sử dụng", 409);

    await User.create({
      username: normalizedUsername,
      hashedPassword: await bcrypt.hash(password, 10),
      email: normalizedEmail,
      displayName: `${firstName.trim()} ${lastName.trim()}`,
    });
  },

  /** @returns {{ user, accessToken, refreshToken }} */
  async signIn(body) {
    validateSignIn(body);
    const identifier = body.username.toLowerCase().trim();

    const user = await User.findOne(
      identifier.includes("@") ? { email: identifier } : { username: identifier }
    ).select("+hashedPassword");

    // Cùng một thông báo cho "không tồn tại" và "sai mật khẩu" — chống dò tài khoản
    const INVALID = "Thông tin đăng nhập không chính xác";
    if (!user) throw new AppError(INVALID, 401);
    if (!(await bcrypt.compare(body.password, user.hashedPassword))) {
      throw new AppError(INVALID, 401);
    }

    return { user, ...(await issueTokens(user._id)) };
  },

  async signOut(refreshToken) {
    if (refreshToken) await Session.deleteOne({ refreshToken });
  },

  /** @returns {Promise<string>} new access token */
  async refresh(refreshToken) {
    if (!refreshToken) throw new AppError("Token không tồn tại", 401);

    const session = await Session.findOne({ refreshToken }).lean();
    if (!session || session.expiresAt < new Date()) {
      if (session) await Session.deleteOne({ _id: session._id });
      throw new AppError("Token không hợp lệ hoặc đã hết hạn", 401);
    }
    return signAccessToken(session.userId);
  },

  /** @returns {{ user, accessToken, refreshToken }} */
  async oauthSignIn(provider, idToken) {
    if (!idToken || typeof idToken !== "string") {
      throw new AppError("Firebase ID token is required", 400);
    }

    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(idToken);
    } catch (error) {
      console.error(`${provider} OAuth verify error:`, error.message);
      if (error.message.includes("Invalid Firebase token")) {
        throw new AppError("Invalid or expired Firebase token", 401);
      }
      throw new AppError(`${provider} authentication failed`, 500);
    }

    const user = await resolveOAuthUser(decodedToken, provider);
    return { user: publicUser(user), ...(await issueTokens(user._id)) };
  },

  async forgotPassword(email) {
    if (!email || typeof email !== "string") throw new AppError("Vui lòng cung cấp email", 400);

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+passwordResetToken +passwordResetExpires"
    );
    // Luôn trả cùng thông báo để tránh dò email
    if (!user) return RESET_MESSAGE;

    // Thư trước vừa gửi chưa tới 1 phút → im lặng bỏ qua (cùng thông báo, không lộ gì)
    const lastSentAt = user.passwordResetExpires
      ? user.passwordResetExpires.getTime() - RESET_TOKEN_TTL_MS
      : 0;
    if (Date.now() - lastSentAt < RESET_EMAIL_COOLDOWN_MS) return RESET_MESSAGE;

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = sha256(rawToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${clientUrl()}/reset-password?token=${rawToken}`;

    try {
      await createTransporter().sendMail({
        from: `"Chat App" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Đặt lại mật khẩu - Chat App",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #0ea5e9; margin-bottom: 8px;">Đặt lại mật khẩu</h2>
          <p style="color: #475569;">Xin chào <strong>${escapeHtml(user.displayName)}</strong>,</p>
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

    return RESET_MESSAGE;
  },

  async resetPassword(token, password) {
    if (!token || !password) throw new AppError("Token và mật khẩu mới là bắt buộc", 400);
    if (typeof token !== "string" || typeof password !== "string") {
      throw new AppError("Dữ liệu không hợp lệ", 400);
    }
    if (password.length < 6) throw new AppError("Mật khẩu phải có ít nhất 6 ký tự", 400);
    if (password.length > 128) throw new AppError("Mật khẩu không được quá 128 ký tự", 400);

    const user = await User.findOne({
      passwordResetToken: sha256(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");
    if (!user) throw new AppError("Token không hợp lệ hoặc đã hết hạn", 400);

    user.hashedPassword = await bcrypt.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Mở được link gửi tới hộp thư = chứng minh sở hữu email → cho phép liên kết OAuth
    user.emailVerified = true;
    user.passwordChangedAt = new Date();
    await user.save();

    // Thu hồi mọi phiên cũ (vd: tài khoản từng bị tạo trước/chiếm bằng email này):
    // refresh token (Session), access token (passwordChangedAt) và socket đang mở
    await Session.deleteMany({ userId: user._id });
    disconnectUserSockets(user._id);
  },
};
