import { asyncHandler } from "../utils/asyncHandler.js";
import { COOKIE_OPTIONS } from "../config/constants.js";
import { authService } from "../services/authService.js";

// HTTP concerns only: cookies + status codes. Business logic → authService.

const REFRESH_COOKIE = "refreshToken";

const setRefreshCookie = (res, refreshToken) =>
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
  });

// POST /api/auth/signup
export const signUp = asyncHandler(async (req, res) => {
  await authService.signUp(req.body);
  res.status(201).json({ message: "Đăng ký thành công" });
});

// POST /api/auth/signin
export const signIn = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.signIn(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ message: `Chào mừng ${user.displayName}!`, accessToken });
});

// POST /api/auth/signout
export const signOut = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await authService.signOut(token);
    clearRefreshCookie(res);
  }
  res.sendStatus(204);
});

// POST /api/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const accessToken = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  res.status(200).json({ accessToken });
});

// POST /api/auth/oauth/google | /api/auth/oauth/github
const oauthHandler = (provider) =>
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.oauthSignIn(
      provider,
      req.body.idToken
    );
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken, user });
  });

export const googleOAuth = oauthHandler("google");
export const githubOAuth = oauthHandler("github");

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const message = await authService.forgotPassword(req.body.email);
  res.status(200).json({ message });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.status(200).json({ message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay." });
});
