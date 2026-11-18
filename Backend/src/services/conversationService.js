import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { AppError } from "../utils/AppError.js";
import { normalizePair } from "../utils/friendship.js";
import { formatConversation, POPULATE_CONVERSATION } from "../utils/formatting.js";
import { validateCreateConversation, isValidObjectId } from "../validators/index.js";
import {
  emitToUsers,
  emitToConversation,
  joinUsersToConversation,
  closeConversationRoom,
} from "../realtime/emitter.js";
import { assertFriendsWithAll } from "./friendService.js";

const DUPLICATE_KEY = 11000;

/** `${minUserId}_${maxUserId}` — cùng thứ tự với Friend.normalizePair */
export const buildDirectKey = (a, b) => normalizePair(a, b).join("_");

const participantIds = (conversation) =>
  conversation.participants.map((p) => (p.userId?._id ?? p.userId).toString());

/**
 * Load a fresh populated copy, then announce a newly created conversation to its
 * members. Reads its own copy so the caller's document is never mutated by
 * populate() (messageService still broadcasts from it afterwards).
 */
const announceNewConversation = async (conversation) => {
  const populated = await Conversation.findById(conversation._id)
    .populate(POPULATE_CONVERSATION)
    .lean();
  if (!populated) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);
  const formatted = formatConversation(populated);
  const memberIds = participantIds(populated);

  // Server-side join: các socket đang online vào phòng ngay, không cần client
  // round-trip "join-conversation" → tin nhắn đầu tiên không bị lỡ.
  joinUsersToConversation(memberIds, populated._id.toString());
  emitToUsers(memberIds, "new-group", formatted);
  return formatted;
};

export const conversationService = {
  /**
   * Find the 1-1 conversation between two users, creating it if needed.
   * Race-safe: the unique index on `directKey` guarantees a single room even
   * when both users send their first message at the same moment — the loser of
   * the race gets E11000 and simply re-reads the winner's document.
   * Legacy rooms (created before `directKey`) are found by participants and
   * backfilled lazily.
   *
   * @returns {Promise<{ conversation: import('mongoose').Document, isNew: boolean }>}
   */
  async findOrCreateDirect(userIdA, userIdB) {
    const directKey = buildDirectKey(userIdA, userIdB);

    const existing = await Conversation.findOne({ directKey });
    if (existing) return { conversation: existing, isNew: false };

    const legacy = await Conversation.findOne({
      type: "direct",
      directKey: { $exists: false },
      "participants.userId": { $all: [userIdA, userIdB] },
    });
    if (legacy) {
      try {
        legacy.directKey = directKey;
        await legacy.save();
      } catch (error) {
        if (error.code !== DUPLICATE_KEY) throw error;
        const winner = await Conversation.findOne({ directKey });
        if (winner) return { conversation: winner, isNew: false };
      }
      return { conversation: legacy, isNew: false };
    }

    const now = new Date();
    try {
      const conversation = await Conversation.create({
        type: "direct",
        directKey,
        participants: [
          { userId: userIdA, joinedAt: now },
          { userId: userIdB, joinedAt: now },
        ],
        lastMessageAt: now,
        unreadCounts: new Map(),
      });
      return { conversation, isNew: true };
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error;
      const winner = await Conversation.findOne({ directKey });
      if (!winner) throw error;
      return { conversation: winner, isNew: false };
    }
  },

  /** POST /api/conversations */
  async create(user, body) {
    validateCreateConversation(body);
    const { type, name } = body;
    const userId = user._id;
    // Bỏ trùng + bỏ chính mình (client có thể gửi lặp)
    const memberIds = [...new Set(body.memberIds)].filter((id) => id !== userId.toString());
    if (memberIds.length === 0) throw new AppError("Danh sách thành viên không hợp lệ", 400);
    if (type === "group" && memberIds.length < 2) {
      throw new AppError("Nhóm cần ít nhất 2 thành viên (ngoài bạn)", 400);
    }

    await assertFriendsWithAll(userId, type === "direct" ? [memberIds[0]] : memberIds);

    if (type === "direct") {
      const { conversation } = await conversationService.findOrCreateDirect(userId, memberIds[0]);
      // Kể cả khi phòng đã tồn tại: đưa lại cho cả 2 phía (client tự bỏ trùng)
      return announceNewConversation(conversation);
    }

    const conversation = await Conversation.create({
      type: "group",
      participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
      group: { name: name.trim(), createdBy: userId },
      lastMessageAt: new Date(),
    });
    return announceNewConversation(conversation);
  },

  /** GET /api/conversations */
  async listForUser(userId) {
    const conversations = await Conversation.find({ "participants.userId": userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate(POPULATE_CONVERSATION)
      .lean();
    return conversations.map(formatConversation);
  },

  /** Ids of every conversation the user belongs to (socket room bootstrap) */
  async getUserConversationIds(userId) {
    const rows = await Conversation.find({ "participants.userId": userId }, { _id: 1 }).lean();
    return rows.map((c) => c._id.toString());
  },

  async isMember(userId, conversationId) {
    if (!isValidObjectId(conversationId)) return false;
    return !!(await Conversation.exists({ _id: conversationId, "participants.userId": userId }));
  },

  /** Throws 400/403 unless the user may read the conversation */
  async assertMember(userId, conversationId) {
    if (!isValidObjectId(conversationId)) {
      throw new AppError("conversationId không hợp lệ", 400);
    }
    if (!(await conversationService.isMember(userId, conversationId))) {
      throw new AppError("Bạn không có quyền xem tin nhắn này", 403);
    }
  },

  /**
   * Atomically applies a newly created message to its conversation:
   *   - $inc unreadCounts.<memberId> for every participant except the sender
   *   - $set unreadCounts.<senderId> = 0, lastMessage, lastMessageAt, seenBy = []
   * One findOneAndUpdate → concurrent messages never lose an increment.
   *
   * @returns {Promise<import('mongoose').Document>} the updated conversation
   */
  async recordNewMessage(conversation, message) {
    const sender = message.senderId.toString();
    const $inc = {};
    for (const memberId of participantIds(conversation)) {
      if (memberId !== sender) $inc[`unreadCounts.${memberId}`] = 1;
    }

    const update = {
      $set: {
        seenBy: [],
        lastMessageAt: message.createdAt,
        lastMessage: {
          _id: message._id.toString(),
          content: message.content,
          senderId: message.senderId,
          createdAt: message.createdAt,
        },
        [`unreadCounts.${sender}`]: 0,
      },
    };
    if (Object.keys($inc).length > 0) update.$inc = $inc;

    const updated = await Conversation.findOneAndUpdate({ _id: conversation._id }, update, {
      new: true,
    });
    if (!updated) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);
    return updated;
  },

  /** Announce a newly created direct conversation (first message path) */
  announceNewConversation,

  /** PATCH /api/conversations/:id/seen */
  async markAsSeen(userId, conversationId) {
    if (!isValidObjectId(conversationId)) {
      throw new AppError("conversationId không hợp lệ", 400);
    }
    const me = userId.toString();

    const updated = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        "participants.userId": me,
        // Chỉ khi tin cuối do người khác gửi
        "lastMessage.senderId": { $ne: me },
      },
      { $addToSet: { seenBy: me }, $set: { [`unreadCounts.${me}`]: 0 } },
      { new: true }
    );

    // null: không phải thành viên, hoặc chính mình gửi tin cuối — đều không cần làm gì
    if (!updated) return null;

    emitToConversation(conversationId, "read-message", {
      conversationId,
      seenBy: updated.seenBy,
      lastMessage: updated.lastMessage,
    });

    return { seenBy: updated.seenBy, myUnreadCount: updated.unreadCounts?.get(me) ?? 0 };
  },

  /** DELETE /api/conversations/:id */
  async remove(userId, conversationId) {
    if (!isValidObjectId(conversationId)) {
      throw new AppError("conversationId không hợp lệ", 400);
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": userId,
    }).lean();
    if (!conversation) throw new AppError("Bạn không có quyền xóa cuộc trò chuyện này", 403);

    // Nhóm: chỉ người tạo nhóm mới được xóa (xóa nhóm = xóa tin của mọi người).
    // Nhóm cũ thiếu group.createdBy sẽ không ai xóa được — an toàn mặc định.
    if (
      conversation.type === "group" &&
      conversation.group?.createdBy?.toString() !== userId.toString()
    ) {
      throw new AppError("Chỉ người tạo nhóm mới có quyền xóa nhóm", 403);
    }

    await Promise.all([
      Conversation.deleteOne({ _id: conversationId }),
      Message.deleteMany({ conversationId }),
    ]);

    emitToConversation(conversationId, "conversation-deleted", { conversationId });
    closeConversationRoom(conversationId);
  },
};
