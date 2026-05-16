import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import crypto from "crypto";
import User from "../models/User.js";
import { signAccessToken, createSession } from "./authController.js";

const CLIENT_URL =
  process.env.CLIENT_URL?.split(",")[0]?.trim() || "http://localhost:5173";

const BASE_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5001}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find an existing user by email or create a new one from OAuth profile data.
 * Keeps OAuth users separate from password-based users by storing a random
 * unusable hash as their password.
 */
const findOrCreateOAuthUser = async ({
  email,
  displayName,
  avatarUrl,
  providerId,
}) => {
  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // Backfill avatar if the user doesn't have one yet
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
      await user.save();
    }
    return user;
  }

  // Derive a username from the email local-part, sanitized to [a-z0-9_]
  let username = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  // Ensure uniqueness by appending last 4 chars of providerId if taken
  const taken = await User.exists({ username });
  if (taken) username = `${username}_${providerId.slice(-4)}`;

  user = await User.create({
    username,
    // Random unusable hash — OAuth users never log in with a password
    hashedPassword: crypto.randomBytes(32).toString("hex"),
    email: email.toLowerCase(),
    displayName: displayName || username,
    avatarUrl: avatarUrl || undefined,
  });

  return user;
};

/** Issue tokens, set cookie, and redirect to the frontend callback page */
const handleOAuthSuccess = async (res, user) => {
  const accessToken = signAccessToken(user._id);
  await createSession(res, user._id);
  return res.redirect(`${CLIENT_URL}/oauth/callback?token=${accessToken}`);
};

// ─── Google Strategy ──────────────────────────────────────────────────────────

const GOOGLE_CONFIGURED =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== "your_google_client_id";

if (GOOGLE_CONFIGURED) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/google/callback`,
      },
      async (_at, _rt, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Không lấy được email từ Google"));

          const user = await findOrCreateOAuthUser({
            email,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
            providerId: profile.id,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// ─── GitHub Strategy ──────────────────────────────────────────────────────────

const GITHUB_CONFIGURED =
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_ID !== "your_github_client_id";

if (GITHUB_CONFIGURED) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (_at, _rt, profile, done) => {
        try {
          const email =
            profile.emails?.find((e) => e.primary)?.value ||
            profile.emails?.[0]?.value ||
            `${profile.username}@github.local`;

          const user = await findOrCreateOAuthUser({
            email,
            displayName: profile.displayName || profile.username,
            avatarUrl: profile.photos?.[0]?.value,
            providerId: String(profile.id),
          });

          return done(null, user);
        } catch (err) {
          return done(err);
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
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${CLIENT_URL}/signin?error=google_failed`,
  }),
  async (req, res) => handleOAuthSuccess(res, req.user),
];

export const githubAuth = passport.authenticate("github", {
  scope: ["user:email"],
  session: false,
});

export const githubCallback = [
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${CLIENT_URL}/signin?error=github_failed`,
  }),
  async (req, res) => handleOAuthSuccess(res, req.user),
];

export const initPassport = (app) => {
  app.use(passport.initialize());
};
