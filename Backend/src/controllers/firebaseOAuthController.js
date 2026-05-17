import crypto from "crypto";
import User from "../models/User.js";
import { signAccessToken, createSession } from "./authController.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

/**
 * Find an existing user by email or create a new one from Firebase OAuth data.
 * OAuth users get a random unusable password hash since they never log in with password.
 */
const findOrCreateOAuthUser = async ({ email, displayName, avatarUrl, firebaseUid }) => {
  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // Update avatar if user doesn't have one
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
      await user.save();
    }
    return user;
  }

  // Create username from email
  let username = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  // Ensure uniqueness
  const taken = await User.exists({ username });
  if (taken) {
    username = `${username}_${firebaseUid.slice(-4)}`;
  }

  // Create new user
  user = await User.create({
    username,
    hashedPassword: crypto.randomBytes(32).toString("hex"), // Random unusable hash
    email: email.toLowerCase(),
    displayName: displayName || username,
    avatarUrl: avatarUrl || undefined,
  });

  return user;
};

/**
 * POST /api/auth/oauth/google
 * Handle Google OAuth login via Firebase
 */
export const googleOAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new AppError("Firebase ID token is required", 400);
  }

  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);

    // Extract user info from Firebase token
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      throw new AppError("Email not found in Firebase token", 400);
    }

    // Find or create user in MongoDB
    const user = await findOrCreateOAuthUser({
      email,
      displayName: name || email.split("@")[0],
      avatarUrl: picture,
      firebaseUid: uid,
    });

    // Generate JWT access token
    const accessToken = signAccessToken(user._id);

    // Create session (refresh token cookie)
    await createSession(res, user._id);

    // Return user data and access token
    return res.status(200).json({
      accessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        statusVisible: user.statusVisible,
      },
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    
    if (error.message.includes("Invalid Firebase token")) {
      throw new AppError("Invalid or expired Firebase token", 401);
    }
    
    throw new AppError("Google authentication failed", 500);
  }
});

/**
 * POST /api/auth/oauth/github
 * Handle GitHub OAuth login via Firebase
 */
export const githubOAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new AppError("Firebase ID token is required", 400);
  }

  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);

    // Extract user info from Firebase token
    const { uid, email, name, picture } = decodedToken;

    // GitHub might not provide email if user's email is private
    const userEmail = email || `${uid}@github.local`;

    // Find or create user in MongoDB
    const user = await findOrCreateOAuthUser({
      email: userEmail,
      displayName: name || userEmail.split("@")[0],
      avatarUrl: picture,
      firebaseUid: uid,
    });

    // Generate JWT access token
    const accessToken = signAccessToken(user._id);

    // Create session (refresh token cookie)
    await createSession(res, user._id);

    // Return user data and access token
    return res.status(200).json({
      accessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        statusVisible: user.statusVisible,
      },
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    
    if (error.message.includes("Invalid Firebase token")) {
      throw new AppError("Invalid or expired Firebase token", 401);
    }
    
    throw new AppError("GitHub authentication failed", 500);
  }
});
