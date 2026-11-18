import { asyncHandler } from "../utils/asyncHandler.js";
import { conversationService } from "../services/conversationService.js";
import { messageService } from "../services/messageService.js";

// HTTP concerns only. Business logic → conversationService / messageService.

// POST /api/conversations
export const createConversation = asyncHandler(async (req, res) => {
  const conversation = await conversationService.create(req.user, req.body);
  res.status(201).json({ conversation });
});

// GET /api/conversations
export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await conversationService.listForUser(req.user._id);
  res.status(200).json({ conversations });
});

// GET /api/conversations/:conversationId/messages?limit=&cursor=
export const getMessages = asyncHandler(async (req, res) => {
  const result = await messageService.list(req.user._id, req.params.conversationId, {
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  res.status(200).json(result);
});

// PATCH /api/conversations/:conversationId/seen
export const markAsSeen = asyncHandler(async (req, res) => {
  const result = await conversationService.markAsSeen(req.user._id, req.params.conversationId);
  if (!result) return res.status(200).json({ message: "Không cần mark as seen" });
  res.status(200).json({ message: "Marked as seen", ...result });
});

// DELETE /api/conversations/:conversationId
export const deleteConversation = asyncHandler(async (req, res) => {
  await conversationService.remove(req.user._id, req.params.conversationId);
  res.status(200).json({ message: "Đã xóa cuộc trò chuyện thành công" });
});
