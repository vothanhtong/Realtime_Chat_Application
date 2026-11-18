import express from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  markAsSeen,
  deleteConversation,
} from "../controllers/conversationController.js";

const router = express.Router();

// Kiểm tra bạn bè nằm trong conversationService.create
router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.patch("/:conversationId/seen", markAsSeen);
router.delete("/:conversationId", deleteConversation);

export default router;