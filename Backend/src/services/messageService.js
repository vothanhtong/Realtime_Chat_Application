import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { AppError } from "../utils/AppError.js";
import { areFriends } from "../utils/friendship.js";
import { isValidObjectId, validateMessagePayload } from "../validators/index.js";
import {
  DEFAULT_MESSAGE_LIMIT,
  MAX_MESSAGE_LIMIT,
  RECALLED_MESSAGE_CONTENT,
} from "../config/constants.js";
import { emitToConversation } from "../realtime/emitter.js";
import { conversationService } from "./conversationService.js";

/**
 * Messages — the single entry point for BOTH REST (messageController) and
 * Socket ("send-message"). Authorization + validation live here so neither
 * transport can bypass them.
 */

// ─── Cursor pagination ────────────────────────────────────────────────────────
// Cursor = "<ISO createdAt>|<_id>" — tie-break bằng _id để không bỏ sót các tin
// trùng mili-giây ở ranh giới trang. Vẫn chấp nhận cursor cũ chỉ có ISO date.

const encodeCursor = (msg) => `${msg.createdAt.toISOString()}|${msg._id}`;

const decodeCursor = (raw) => {
  if (typeof raw !== "string") throw new AppError("cursor không hợp lệ", 400);
  const [iso, id] = raw.split("|");
  const createdAt = new Date(iso);
  if (isNaN(createdAt.getTime())) throw new AppError("cursor không hợp lệ", 400);
  if (id !== undefined && !isValidObjectId(id)) throw new AppError("cursor không hợp lệ", 400);
  return { createdAt, id };
};

const parseLimit = (raw) => {
  const n = parseInt(raw, 10);
  return Math.min(Math.max(isNaN(n) ? DEFAULT_MESSAGE_LIMIT : n, 1), MAX_MESSAGE_LIMIT);
};

// ─── Conversation resolution + authorization (send) ──────────────────────────

const resolveDirectConversation = async (senderId, { conversationId, recipientId }) => {
  const me = senderId.toString();

  // Existing room: the recipient is derived from the room, never trusted from the client
  if (conversationId) {
    if (!isValidObjectId(conversationId)) throw new AppError("conversationId không hợp lệ", 400);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": senderId,
    });
    if (!conversation) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);
    if (conversation.type !== "direct") throw new AppError("Loại cuộc trò chuyện không khớp", 400);

    const other = conversation.participants.find((p) => p.userId.toString() !== me);
    if (!other) throw new AppError("Cuộc trò chuyện không hợp lệ", 400);
    if (!(await areFriends(me, other.userId))) {
      throw new AppError("Bạn chưa kết bạn với người này", 403);
    }
    return { conversation, isNew: false };
  }

  if (!isValidObjectId(recipientId)) throw new AppError("recipientId không hợp lệ", 400);
  if (recipientId === me) throw new AppError("Không thể nhắn tin cho chính mình", 400);
  if (!(await areFriends(me, recipientId))) {
    throw new AppError("Bạn chưa kết bạn với người này", 403);
  }

  // Race-safe (unique directKey) — 2 người nhắn đồng thời vẫn chỉ có 1 phòng
  return conversationService.findOrCreateDirect(senderId, recipientId);
};

const resolveGroupConversation = async (senderId, { conversationId }) => {
  if (!isValidObjectId(conversationId)) throw new AppError("conversationId không hợp lệ", 400);

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);
  if (conversation.type !== "group") throw new AppError("Loại cuộc trò chuyện không khớp", 400);

  const isMember = conversation.participants.some(
    (p) => p.userId.toString() === senderId.toString()
  );
  if (!isMember) throw new AppError("Bạn không ở trong nhóm này", 403);

  return { conversation, isNew: false };
};

/** Broadcast "new-message" to the room — sender info from the authenticated user, no DB lookup */
const broadcastNewMessage = (conversation, message, sender) => {
  emitToConversation(conversation._id.toString(), "new-message", {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage: {
        ...(conversation.lastMessage?.toObject?.() ?? conversation.lastMessage),
        sender: {
          _id: sender._id,
          displayName: sender.displayName ?? "",
          avatarUrl: sender.avatarUrl || null,
        },
      },
      lastMessageAt: conversation.lastMessageAt,
      seenBy: conversation.seenBy || [],
    },
    unreadCounts: conversation.unreadCounts ? Object.fromEntries(conversation.unreadCounts) : {},
  });
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const messageService = {
  /**
   * Validate, authorize, persist and broadcast a message.
   * @param {{ _id: any, displayName?: string, avatarUrl?: string | null }} sender
   * @param {{ type: "direct"|"group", conversationId?, recipientId?, content?, imgUrl? }} input
   * @throws {AppError} 400 invalid input · 403 not friend/member · 404 not found
   */
  async send(sender, { type, conversationId, recipientId, content, imgUrl }) {
    if (!sender?._id) throw new AppError("Unauthorized", 401);
    if (type !== "direct" && type !== "group") {
      throw new AppError("Loại cuộc trò chuyện không hợp lệ (direct | group)", 400);
    }

    // Validate payload before touching the DB
    const payload = validateMessagePayload({ content, imgUrl });

    const { conversation, isNew } =
      type === "direct"
        ? await resolveDirectConversation(sender._id, { conversationId, recipientId })
        : await resolveGroupConversation(sender._id, { conversationId });

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: sender._id,
      content: payload.content,
      imgUrl: payload.imgUrl,
    });

    // Atomic $inc/$set — không mất lượt đếm unread khi nhiều tin đến cùng lúc
    const updated = await conversationService.recordNewMessage(conversation, message);

    // Phòng mới: join server-side + "new-group" TRƯỚC khi broadcast tin đầu tiên
    if (isNew) await conversationService.announceNewConversation(updated);

    broadcastNewMessage(updated, message, sender);
    return { conversation: updated, message };
  },

  /** GET /api/conversations/:id/messages — newest page first, returned chronologically */
  async list(userId, conversationId, { limit: rawLimit, cursor } = {}) {
    await conversationService.assertMember(userId, conversationId);

    const limit = parseLimit(rawLimit);
    const query = { conversationId, deletedBy: { $ne: userId } };

    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      query.$or = id
        ? [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: new mongoose.Types.ObjectId(id) } },
          ]
        : [{ createdAt: { $lt: createdAt } }];
    }

    // Fetch one extra to determine if there are more pages
    let messages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .select("conversationId senderId content imgUrl isRecalled createdAt")
      .lean();

    let nextCursor = null;
    if (messages.length > limit) {
      nextCursor = encodeCursor(messages[limit - 1]);
      messages = messages.slice(0, limit);
    }

    return { messages: messages.reverse(), nextCursor };
  },

  /** DELETE /api/messages/:id — hide for the requesting user only */
  async deleteForUser(userId, messageId) {
    if (!isValidObjectId(messageId)) throw new AppError("ID tin nhắn không hợp lệ", 400);

    const message = await Message.findById(messageId);
    if (!message) throw new AppError("Không tìm thấy tin nhắn", 404);

    if (!(await conversationService.isMember(userId, message.conversationId.toString()))) {
      throw new AppError("Bạn không có quyền xóa tin nhắn này", 403);
    }

    await Message.updateOne({ _id: messageId }, { $addToSet: { deletedBy: userId } });
  },

  /** POST /api/messages/:id/recall — sender only, for everyone */
  async recall(userId, messageId) {
    if (!isValidObjectId(messageId)) throw new AppError("ID tin nhắn không hợp lệ", 400);

    const message = await Message.findById(messageId);
    if (!message) throw new AppError("Không tìm thấy tin nhắn", 404);
    if (message.senderId.toString() !== userId.toString()) {
      throw new AppError("Bạn chỉ có thể thu hồi tin nhắn của chính mình", 403);
    }
    if (message.isRecalled) throw new AppError("Tin nhắn đã được thu hồi", 400);

    message.isRecalled = true;
    message.content = RECALLED_MESSAGE_CONTENT;
    message.imgUrl = undefined;
    await message.save();

    // Nếu là tin cuối, cập nhật snapshot lastMessage để sidebar không còn nội dung gốc
    // (lastMessage._id được lưu dạng String — xem models/Conversation.js)
    await Conversation.updateOne(
      { _id: message.conversationId, "lastMessage._id": message._id.toString() },
      { $set: { "lastMessage.content": RECALLED_MESSAGE_CONTENT } }
    );

    emitToConversation(message.conversationId.toString(), "message-recalled", {
      messageId: message._id,
      conversationId: message.conversationId,
      content: message.content,
    });

    return message;
  },
};
