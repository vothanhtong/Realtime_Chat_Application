import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateSignIn, validateSignUp } from "../middlewares/validate.js";
import {
  ACCESS_TOKEN_TTL,
  COOKIE_OPTIONS,
  REFRESH_TOKEN_TTL_MS,
} from "../config/constants.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Issue a short-lived JWT access token for a given userId */
export const signAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

/** Create a refresh-token session and set the httpOnly cookie */
export const createSession = async (res, userId) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");

  await Session.create({
    userId,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
  return refreshToken;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const signUp = asyncHandler(async (req, res) => {
  validateSignUp(req.body);

  const { username, password, email, firstName, lastName } = req.body;

  const [duplicateUsername, duplicateEmail] = await Promise.all([
    User.exists({ username: username.toLowerCase().trim() }),
    User.exists({ email: email.toLowerCase().trim() }),
  ]);

  if (duplicateUsername) throw new AppError("Username đã tồn tại", 409);
  if (duplicateEmail) throw new AppError("Email đã được sử dụng", 409);

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    username: username.toLowerCase().trim(),
    hashedPassword,
    email: email.toLowerCase().trim(),
    displayName: `${firstName.trim()} ${lastName.trim()}`,
  });

  return res.status(201).json({ message: "Đăng ký thành công" });
});

export const signIn = asyncHandler(async (req, res) => {
  validateSignIn(req.body);

  const { username, password } = req.body;
  const isEmail = username.includes("@");

  const user = await User.findOne(
    isEmail
      ? { email: username.toLowerCase().trim() }
      : { username: username.toLowerCase().trim() }
  ).select("+hashedPassword");

  // Use same message for both "not found" and "wrong password" to prevent user enumeration
  const INVALID_CREDENTIALS = "Thông tin đăng nhập không chính xác";

  if (!user) throw new AppError(INVALID_CREDENTIALS, 401);

  const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordCorrect) throw new AppError(INVALID_CREDENTIALS, 401);

  const accessToken = signAccessToken(user._id);
  await createSession(res, user._id);

  return res.status(200).json({
    message: `Chào mừng ${user.displayName}!`,
    accessToken,
  });
});

export const signOut = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    await Session.deleteOne({ refreshToken: token });
    res.clearCookie("refreshToken", {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
    });
  }

  return res.sendStatus(204);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError("Token không tồn tại", 401);

  const session = await Session.findOne({ refreshToken: token }).lean();

  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session if it exists
    if (session) await Session.deleteOne({ _id: session._id });
    throw new AppError("Token không hợp lệ hoặc đã hết hạn", 403);
  }

  const accessToken = signAccessToken(session.userId);
  return res.status(200).json({ accessToken });
});
