import express from "express";
import {
  refreshToken,
  signIn,
  signOut,
  signUp,
} from "../controllers/authController.js";
import {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
} from "../controllers/oauthController.js";
import {
  googleOAuth,
  githubOAuth,
} from "../controllers/firebaseOAuthController.js";

const router = express.Router();

// Email/password auth
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/refresh", refreshToken);

// Firebase OAuth (NEW - recommended)
router.post("/oauth/google", googleOAuth);
router.post("/oauth/github", githubOAuth);

// Passport OAuth (OLD - for backward compatibility)
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/github", githubAuth);
router.get("/github/callback", githubCallback);

export default router;
