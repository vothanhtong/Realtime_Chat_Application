/**
 * Shared utility to format and populate conversation objects
 */

export const formatConversation = (convo) => {
  const raw = typeof convo.toObject === "function" ? convo.toObject() : convo;

  const participants = (raw.participants || []).map((p) => ({
    _id: p.userId?._id ?? p.userId,
    displayName: p.userId?.displayName ?? null,
    avatarUrl: p.userId?.avatarUrl ?? null,
    statusVisible: p.userId?.statusVisible ?? true,
    joinedAt: p.joinedAt,
  }));

  // unreadCounts can be a Map (Mongoose doc) or plain object (lean)
  let unreadCounts = {};
  if (raw.unreadCounts instanceof Map) {
    unreadCounts = Object.fromEntries(raw.unreadCounts);
  } else if (raw.unreadCounts && typeof raw.unreadCounts === "object") {
    unreadCounts = raw.unreadCounts;
  }

  // Normalize lastMessage: transform senderId (populated) → sender
  let lastMessage = raw.lastMessage ?? null;
  if (lastMessage) {
    const senderId = lastMessage.senderId;
    const sender =
      senderId && typeof senderId === "object"
        ? { _id: senderId._id, displayName: senderId.displayName ?? "", avatarUrl: senderId.avatarUrl ?? null }
        : { _id: senderId, displayName: "", avatarUrl: null };

    lastMessage = {
      _id: lastMessage._id,
      content: lastMessage.content ?? null,
      createdAt: lastMessage.createdAt,
      sender,
    };
  }

  return { ...raw, participants, unreadCounts, lastMessage };
};

export const POPULATE_CONVERSATION = [
  { path: "participants.userId", select: "displayName avatarUrl statusVisible" },
  { path: "seenBy", select: "displayName avatarUrl" },
  { path: "lastMessage.senderId", select: "displayName avatarUrl" },
];
