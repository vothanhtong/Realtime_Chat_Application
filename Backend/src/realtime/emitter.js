/**
 * Realtime gateway — the ONLY module that holds the Socket.IO server instance.
 *
 * Services emit through these helpers instead of importing socket/ or reading
 * req.app.get("io"), so the dependency direction stays:
 *     controllers → services → realtime/emitter   (socket/ → services)
 *
 * Room naming (single source of truth):
 *   user:<userId>                 every socket of that user (all tabs/devices)
 *   conversation:<conversationId> every member socket of that conversation
 *
 * All helpers are no-ops until setIO() is called (scripts, unit tests).
 */

/** @type {import('socket.io').Server | null} */
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const userRoom = (userId) => `user:${userId}`;
export const conversationRoom = (conversationId) => `conversation:${conversationId}`;

const unique = (ids) => [...new Set((ids ?? []).filter(Boolean).map(String))];

/** Emit to every socket of the given users */
export const emitToUsers = (userIds, event, payload) => {
  const rooms = unique(userIds).map(userRoom);
  if (io && rooms.length) io.to(rooms).emit(event, payload);
};

/** Emit to every member socket of a conversation */
export const emitToConversation = (conversationId, event, payload) => {
  if (io && conversationId) io.to(conversationRoom(conversationId)).emit(event, payload);
};

/**
 * Emit once to the union of several users' rooms and conversation rooms.
 * Socket.IO de-duplicates sockets present in more than one target room.
 */
export const emitToAudience = ({ userIds = [], conversationIds = [] }, event, payload) => {
  const rooms = [
    ...unique(userIds).map(userRoom),
    ...unique(conversationIds).map(conversationRoom),
  ];
  if (io && rooms.length) io.to(rooms).emit(event, payload);
};

/**
 * Server-side join: put every connected socket of these users into a
 * conversation room (e.g. right after the conversation is created), so the
 * very first message reaches them without a client round-trip.
 */
export const joinUsersToConversation = (userIds, conversationId) => {
  if (!io) return;
  const rooms = unique(userIds).map(userRoom);
  if (rooms.length) io.in(rooms).socketsJoin(conversationRoom(conversationId));
};

/**
 * Force-close every socket of a user (password reset). Server-initiated
 * disconnects are never restored by connectionStateRecovery, so the next
 * connection must pass socketAuthMiddleware again.
 */
export const disconnectUserSockets = (userId) => {
  if (io && userId) io.in(userRoom(userId.toString())).disconnectSockets(true);
};

/** Remove all sockets from a conversation room (conversation deleted) */
export const closeConversationRoom = (conversationId) => {
  if (io) io.in(conversationRoom(conversationId)).socketsLeave(conversationRoom(conversationId));
};
