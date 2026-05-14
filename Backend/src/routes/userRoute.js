import express from "express";
import {
  authMe,
  searchByUsername,
  updateProfile,
  uploadAvatar,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/search", searchByUsername);
router.patch("/profile", updateProfile);
router.post("/uploadAvatar", uploadAvatar);

export default router;
