import express from "express";

import {
  sendDirectMessage,
  sendGroupMessage,
  deleteMessage,
  recallMessage,
} from "../controllers/messageController.js";

const router = express.Router();

// Kiểm tra bạn bè / thành viên nhóm nằm trong services/messageService.js
// (dùng chung với Socket "send-message") — không cần middleware riêng ở đây.
router.post("/direct", sendDirectMessage);
router.post("/group", sendGroupMessage);
router.delete("/:messageId", deleteMessage);
router.post("/:messageId/recall", recallMessage);

export default router;