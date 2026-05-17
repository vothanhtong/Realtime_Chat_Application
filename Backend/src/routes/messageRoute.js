import express from "express";

import {
  sendDirectMessage,
  sendGroupMessage,
  deleteMessage,
  recallMessage,
} from "../controllers/messageController.js";
import {
  checkFriendship,
  checkGroupMembership,
} from "../middlewares/friendMiddleware.js";

const router = express.Router();

router.post("/direct", checkFriendship, sendDirectMessage);
router.post("/group", checkGroupMembership, sendGroupMessage);
router.delete("/:messageId", deleteMessage);
router.post("/:messageId/recall", recallMessage);

export default router;