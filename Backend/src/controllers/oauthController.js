import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";
const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;
const CLIENT_URL = process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173";

// ─── Helper: tạo session + trả token ─────────────────────────────────────────
const createSessionAndRedirect = async (res, user) => {
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = crypto.randomBytes(64).toString("hex");

  await Session.create({
    userId: user._id,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: REFRESH_TOKEN_TTL,
  });

  // Redirect về frontend kèm accessToken trong query (frontend sẽ lưu vào store)
  return res.redirect(`${CLIENT_URL}/oauth/callback?token=${accessToken}`);
};

// ─── Helper: tìm hoặc tạo user từ OAuth ──────────────────────────────────────
const findOrCreateOAuthUser = async ({ email, displayName, avatarUrl, provider, providerId }) => {
  // Tìm theo email trước
  let user = await User.findOne({ email });

  if (user) {
    // Cập nhật avatar nếu chưa có
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
      await user.save();
    }
    return user;
  }

  // Tạo username từ email hoặc providerId
  let username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");

  // Đảm bảo username unique
  const existing = await User.findOne({ username });
  if (existing) {
    username = `${username}_${providerId.slice(-4)}`;
  }

  // Tạo user mới (không có password — đăng nhập qua OAuth)
  user = await User.create({
    username,
    hashedPassword: crypto.randomBytes(32).toString("hex"), // random, không dùng được
    email,
    displayName: displayName || username,
    avatarUrl: avatarUrl || undefined,
  });

  return user;
};

// ─── Google Strategy ──────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "your_google_client_id") {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Không lấy được email từ Google"));

          const user = await findOrCreateOAuthUser({
            email,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
            provider: "google",
            providerId: profile.id,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

// ─── GitHub Strategy ──────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== "your_github_client_id") {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.find((e) => e.primary)?.value ||
            profile.emails?.[0]?.value ||
            `${profile.username}@github.local`;

          const user = await findOrCreateOAuthUser({
            email,
            displayName: profile.displayName || profile.username,
            avatarUrl: profile.photos?.[0]?.value,
            provider: "github",
            providerId: profile.id,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

// ─── Route handlers ───────────────────────────────────────────────────────────
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
});

export const googleCallback = [
  passport.authenticate("google", { session: false, failureRedirect: `${CLIENT_URL}/signin?error=google_failed` }),
  async (req, res) => {
    await createSessionAndRedirect(res, req.user);
  },
];

export const githubAuth = passport.authenticate("github", {
  scope: ["user:email"],
  session: false,
});

export const githubCallback = [
  passport.authenticate("github", { session: false, failureRedirect: `${CLIENT_URL}/signin?error=github_failed` }),
  async (req, res) => {
    await createSessionAndRedirect(res, req.user);
  },
];

export const initPassport = (app) => {
  app.use(passport.initialize());
};
