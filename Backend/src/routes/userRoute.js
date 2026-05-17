import express from "express";
import {
  authMe,
  searchByUsername,
  updateProfile,
  uploadAvatar,
  uploadChatMessageImage,
  updateStatusVisibility,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/search", searchByUsername);
router.patch("/profile", updateProfile);
router.post("/uploadAvatar", uploadAvatar);
router.post("/uploadImage", uploadChatMessageImage);
router.patch("/status-visible", updateStatusVisibility);

export default router;
