import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { formatConversation, POPULATE_CONVERSATION } from "./formatting.js";

/**
 * Updates a conversation document in-memory after a new message is created.
 * Call conversation.save() after this to persist.
 *
 * @param {import('mongoose').Document} conversation
 * @param {import('mongoose').Document} message
 * @param {import('mongoose').Types.ObjectId} senderId
 */
export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId
) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      senderId,
      createdAt: message.createdAt,
    },
  });

  conversation.participants.forEach((p) => {
    const memberId = p.userId.toString();
    const isSender = memberId === senderId.toString();
    const prev = conversation.unreadCounts.get(memberId) ?? 0;
    conversation.unreadCounts.set(memberId, isSender ? 0 : prev + 1);
  });
};

/**
 * Emits a "new-message" socket event to all members of the conversation room.
 *
 * @param {import('socket.io').Server} io
 * @param {import('mongoose').Document} conversation
 * @param {import('mongoose').Document} message
 */
export const emitNewMessage = async (io, conversation, message) => {
  // Convert Map → plain object so Socket.IO can serialize it correctly
  const unreadCounts = conversation.unreadCounts
    ? Object.fromEntries(conversation.unreadCounts)
    : {};

  // Look up sender info so frontend can display name/avatar in sidebar
  const senderId = message.senderId;
  let sender = { _id: senderId, displayName: "", avatarUrl: null };

  try {
    const senderUser = await User.findById(senderId)
      .select("displayName avatarUrl")
      .lean();
    if (senderUser) {
      sender = {
        _id: senderUser._id,
        displayName: senderUser.displayName,
        avatarUrl: senderUser.avatarUrl || null,
      };
    }
  } catch {
    // Fallback to empty sender — non-critical
  }

  // Build lastMessage with full sender info for the frontend
  const lastMessage = {
    ...conversation.lastMessage?.toObject?.() ?? conversation.lastMessage,
    sender,
  };

  io.to(conversation._id.toString()).emit("new-message", {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      seenBy: conversation.seenBy || [],
    },
    unreadCounts,
  });
};

/**
 * Core logic for saving a message and broadcasting it.
 * Used by both REST controllers and Socket handlers.
 */
export const saveAndBroadcastMessage = async (io, {
  senderId,
  conversationId,
  recipientId,
  content,
  imgUrl,
  type = "direct"
}) => {
  let conversation = null;
  let isNewConvo = false;

  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": senderId,
    });
  }

  if (!conversation && type === "direct" && recipientId) {
    conversation = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [senderId, recipientId] },
    });
  }

  if (!conversation) {
    if (type === "direct") {
      if (!recipientId) throw new Error("Cần cung cấp recipientId");
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
      isNewConvo = true;
    } else {
      throw new Error("Không tìm thấy conversation");
    }
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    content: (content || "").trim(),
    imgUrl: imgUrl || undefined,
  });

  updateConversationAfterCreateMessage(conversation, message, senderId);
  await conversation.save();

  if (isNewConvo) {
    await conversation.populate(POPULATE_CONVERSATION);
    const formatted = formatConversation(conversation);
    [senderId.toString(), recipientId.toString()].forEach((id) => {
      io.to(id).emit("new-group", formatted);
    });
  }

  await emitNewMessage(io, conversation, message);

  return { conversation, message };
};
