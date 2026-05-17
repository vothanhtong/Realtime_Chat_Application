import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateSendMessage } from "../middlewares/validate.js";
import {
  saveAndBroadcastMessage,
} from "../utils/messageHelper.js";

// POST /api/messages/direct
export const sendDirectMessage = asyncHandler(async (req, res) => {
  validateSendMessage(req.body);

  const { recipientId, content, conversationId } = req.body;
  const senderId = req.user._id;

  const io = req.app.get("io");
  const { message } = await saveAndBroadcastMessage(io, {
    senderId,
    conversationId,
    recipientId,
    content,
    type: "direct",
  });

  return res.status(201).json({ message });
});

// POST /api/messages/group
export const sendGroupMessage = asyncHandler(async (req, res) => {
  validateSendMessage(req.body);

  const { conversationId, content } = req.body;
  const senderId = req.user._id;

  const io = req.app.get("io");
  const { message } = await saveAndBroadcastMessage(io, {
    senderId,
    conversationId,
    content,
    type: "group",
  });

  return res.status(201).json({ message });
});

// DELETE /api/messages/:messageId
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Không tìm thấy tin nhắn", 404);

  // Check if user is participant of the conversation
  const conversation = await Conversation.findOne({
    _id: message.conversationId,
    "participants.userId": userId,
  });
  if (!conversation) throw new AppError("Bạn không có quyền xóa tin nhắn này", 403);

  // Add to deletedBy if not already there
  if (!message.deletedBy.includes(userId)) {
    message.deletedBy.push(userId);
    await message.save();
  }

  return res.status(200).json({ message: "Đã xóa tin nhắn cho chính bạn" });
});

// POST /api/messages/:messageId/recall
export const recallMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Không tìm thấy tin nhắn", 404);

  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError("Bạn chỉ có thể thu hồi tin nhắn của chính mình", 403);
  }

  if (message.isRecalled) throw new AppError("Tin nhắn đã được thu hồi", 400);

  message.isRecalled = true;
  message.content = "Tin nhắn đã bị thu hồi";
  message.imgUrl = undefined;
  await message.save();

  // Notify other participants via socket
  const io = req.app.get("io");
  io.to(message.conversationId.toString()).emit("message-recalled", {
    messageId: message._id,
    conversationId: message.conversationId,
    content: message.content,
  });

  return res.status(200).json({ message: "Đã thu hồi tin nhắn", recalledMessage: message });
});
