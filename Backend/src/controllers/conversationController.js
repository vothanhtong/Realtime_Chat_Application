import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateCreateConversation, isValidObjectId } from "../middlewares/validate.js";
import { io } from "../socket/index.js";
import {
  DEFAULT_MESSAGE_LIMIT,
  MAX_MESSAGE_LIMIT,
} from "../config/constants.js";

// ─── Shared formatter ─────────────────────────────────────────────────────────

/**
 * Converts a Mongoose Conversation document (or lean object) into a
 * consistent shape for API responses and socket events.
 */
const formatConversation = (convo) => {
  const raw = typeof convo.toObject === "function" ? convo.toObject() : convo;

  const participants = (raw.participants || []).map((p) => ({
    _id: p.userId?._id ?? p.userId,
    displayName: p.userId?.displayName ?? null,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

  // unreadCounts can be a Map (Mongoose doc) or plain object (lean)
  let unreadCounts = {};
  if (raw.unreadCounts instanceof Map) {
    unreadCounts = Object.fromEntries(raw.unreadCounts);
  } else if (raw.unreadCounts && typeof raw.unreadCounts === "object") {
    unreadCounts = raw.unreadCounts;
  }

  return { ...raw, participants, unreadCounts };
};

const POPULATE_CONVERSATION = [
  { path: "participants.userId", select: "displayName avatarUrl" },
  { path: "seenBy", select: "displayName avatarUrl" },
  { path: "lastMessage.senderId", select: "displayName avatarUrl" },
];

// ─── Controllers ──────────────────────────────────────────────────────────────

// POST /api/conversations
export const createConversation = asyncHandler(async (req, res) => {
  validateCreateConversation(req.body);

  const { type, name, memberIds } = req.body;
  const userId = req.user._id;

  let conversation;

  if (type === "direct") {
    const participantId = memberIds[0];

    // Reuse existing direct conversation if it exists
    conversation = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [userId, participantId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [{ userId }, { userId: participantId }],
        lastMessageAt: new Date(),
      });
    }
  } else {
    // group
    conversation = await Conversation.create({
      type: "group",
      participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
      group: { name: name.trim(), createdBy: userId },
      lastMessageAt: new Date(),
    });
  }

  await conversation.populate(POPULATE_CONVERSATION);
  const formatted = formatConversation(conversation);

  // Notify all participants via socket
  const allParticipantIds =
    type === "group"
      ? [userId.toString(), ...memberIds]
      : [userId.toString(), memberIds[0]];

  allParticipantIds.forEach((id) => {
    io.to(id.toString()).emit("new-group", formatted);
  });

  return res.status(201).json({ conversation: formatted });
});

// GET /api/conversations
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    "participants.userId": userId,
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate(POPULATE_CONVERSATION)
    .lean();

  const formatted = conversations.map(formatConversation);

  return res.status(200).json({ conversations: formatted });
});

// GET /api/conversations/:conversationId/messages
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  if (!isValidObjectId(conversationId)) {
    throw new AppError("conversationId không hợp lệ", 400);
  }

  const userId = req.user._id;

  // Verify membership (lean — only need to check existence)
  const isMember = await Conversation.exists({
    _id: conversationId,
    "participants.userId": userId,
  });

  if (!isMember) {
    throw new AppError("Bạn không có quyền xem tin nhắn này", 403);
  }

  // Sanitize pagination params
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(
    Math.max(isNaN(rawLimit) ? DEFAULT_MESSAGE_LIMIT : rawLimit, 1),
    MAX_MESSAGE_LIMIT
  );

  const query = { conversationId };

  if (req.query.cursor) {
    const cursorDate = new Date(req.query.cursor);
    if (isNaN(cursorDate.getTime())) {
      throw new AppError("cursor không hợp lệ", 400);
    }
    query.createdAt = { $lt: cursorDate };
  }

  // Fetch one extra to determine if there are more pages
  let messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .select("conversationId senderId content imgUrl createdAt")
    .lean();

  let nextCursor = null;
  if (messages.length > limit) {
    nextCursor = messages[limit - 1].createdAt.toISOString();
    messages = messages.slice(0, limit);
  }

  // Return in chronological order
  messages.reverse();

  return res.status(200).json({ messages, nextCursor });
});

// PATCH /api/conversations/:conversationId/seen
export const markAsSeen = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  if (!isValidObjectId(conversationId)) {
    throw new AppError("conversationId không hợp lệ", 400);
  }

  const userId = req.user._id.toString();

  const updated = await Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      "participants.userId": userId,
      // Only update if the last message was sent by someone else
      "lastMessage.senderId": { $ne: userId },
    },
    {
      $addToSet: { seenBy: userId },
      $set: { [`unreadCounts.${userId}`]: 0 },
    },
    { new: true }
  );

  // If null: either not a member, or user is the sender — both are fine
  if (!updated) {
    return res.status(200).json({ message: "Không cần mark as seen" });
  }

  io.to(conversationId).emit("read-message", {
    conversationId,
    seenBy: updated.seenBy,
    lastMessage: updated.lastMessage,
  });

  return res.status(200).json({
    message: "Marked as seen",
    seenBy: updated.seenBy,
    myUnreadCount: updated.unreadCounts?.get(userId) ?? 0,
  });
});

// DELETE /api/conversations/:conversationId
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  if (!isValidObjectId(conversationId)) {
    throw new AppError("conversationId không hợp lệ", 400);
  }

  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    "participants.userId": userId,
  }).lean();

  if (!conversation) {
    throw new AppError("Bạn không có quyền xóa cuộc trò chuyện này", 403);
  }

  // Delete conversation and all its messages in parallel
  await Promise.all([
    Conversation.deleteOne({ _id: conversationId }),
    Message.deleteMany({ conversationId }),
  ]);

  io.to(conversationId).emit("conversation-deleted", { conversationId });

  return res.status(200).json({ message: "Đã xóa cuộc trò chuyện thành công" });
});

// ─── Internal helper (used by socket) ────────────────────────────────────────

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 }
    ).lean();
    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Lỗi khi fetch conversations cho socket:", error);
    return [];
  }
};
