import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshToken,
  googleOAuth,
  githubOAuth,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

// Email/password auth
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/refresh", refreshToken);

// Forgot & Reset password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Firebase OAuth (luồng OAuth duy nhất)
router.post("/oauth/google", googleOAuth);
router.post("/oauth/github", githubOAuth);

export default router;
