import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateSendMessage } from "../middlewares/validate.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";

// POST /api/messages/direct
export const sendDirectMessage = asyncHandler(async (req, res) => {
  validateSendMessage(req.body);

  const { recipientId, content, conversationId } = req.body;
  const senderId = req.user._id;

  let conversation = null;

  // 1. Try to find by explicit conversationId first
  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": senderId,
    });
  }

  // 2. Fall back to finding existing direct conversation between the two users
  if (!conversation && recipientId) {
    conversation = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [senderId, recipientId] },
    });
  }

  // 3. Create new conversation if none exists
  if (!conversation) {
    if (!recipientId) throw new AppError("Cần cung cấp recipientId", 400);

    conversation = await Conversation.create({
      type: "direct",
      participants: [
        { userId: senderId, joinedAt: new Date() },
        { userId: recipientId, joinedAt: new Date() },
      ],
      lastMessageAt: new Date(),
      unreadCounts: new Map(),
    });
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    content: content.trim(),
  });

  updateConversationAfterCreateMessage(conversation, message, senderId);
  await conversation.save();
  emitNewMessage(io, conversation, message);

  return res.status(201).json({ message });
});

// POST /api/messages/group
export const sendGroupMessage = asyncHandler(async (req, res) => {
  validateSendMessage(req.body);

  const { conversationId, content } = req.body;
  const senderId = req.user._id;
  const conversation = req.conversation; // attached by checkGroupMembership middleware

  const message = await Message.create({
    conversationId,
    senderId,
    content: content.trim(),
  });

  updateConversationAfterCreateMessage(conversation, message, senderId);
  await conversation.save();
  emitNewMessage(io, conversation, message);

  return res.status(201).json({ message });
});
