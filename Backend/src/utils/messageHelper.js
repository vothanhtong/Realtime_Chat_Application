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
export const emitNewMessage = (io, conversation, message) => {
  // Convert Map → plain object so Socket.IO can serialize it correctly
  const unreadCounts = conversation.unreadCounts
    ? Object.fromEntries(conversation.unreadCounts)
    : {};

  io.to(conversation._id.toString()).emit("new-message", {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCounts,
  });
};
