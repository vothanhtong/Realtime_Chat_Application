import mongoose from "mongoose";
import { getFriendIds } from "../utils/friendship.js";
import { emitToUsers } from "../realtime/emitter.js";

/**
 * In-memory presence (single process — see README for multi-instance notes).
 *
 * Privacy rules:
 *   - "user-online" / "user-offline" go ONLY to the user's friends (never io.emit)
 *   - a user in incognito mode (statusVisible = false) never emits presence and
 *     never appears in anyone's "online-users" list
 *   - toggling incognito while online looks like going offline / coming back
 *
 * State mutations are synchronous (safe to call before any await in the socket
 * handler); only the friend lookup + emit is async and fire-and-forget.
 */

// userId → number of active sockets (multi-tab)
const connectionCounts = new Map();
// userId → visible? (synced from DB on connect / REST toggle)
const visibility = new Map();

const isVisibleOnline = (userId) =>
  (connectionCounts.get(userId) ?? 0) > 0 && visibility.get(userId) !== false;

const announceToFriends = (userId, event) => {
  // Đang shutdown (DB đã đóng, io.close() ngắt các socket): không còn ai để báo
  if (mongoose.connection.readyState !== 1) return;
  getFriendIds(userId)
    .then((friendIds) => emitToUsers(friendIds, event, userId))
    .catch((err) => console.error(`presence ${event} error:`, err));
};

export const presenceService = {
  handleConnection(userId, statusVisible) {
    const prev = connectionCounts.get(userId) ?? 0;
    connectionCounts.set(userId, prev + 1);
    visibility.set(userId, statusVisible !== false);

    if (prev === 0 && isVisibleOnline(userId)) announceToFriends(userId, "user-online");
  },

  handleDisconnect(userId) {
    const count = (connectionCounts.get(userId) ?? 1) - 1;
    if (count > 0) {
      connectionCounts.set(userId, count);
      return;
    }

    const wasVisible = visibility.get(userId) !== false;
    connectionCounts.delete(userId);
    visibility.delete(userId);
    if (wasVisible) announceToFriends(userId, "user-offline");
  },

  /** Incognito toggle (called by userService after the DB update) */
  setVisibility(userId, visible) {
    const online = (connectionCounts.get(userId) ?? 0) > 0;
    const wasVisible = visibility.get(userId) !== false;
    if (!online) return; // nothing to announce; DB value is read on next connect

    visibility.set(userId, visible);
    if (wasVisible && !visible) announceToFriends(userId, "user-offline");
    if (!wasVisible && visible) announceToFriends(userId, "user-online");
  },

  /** Online + visible friends of a user — the initial "online-users" payload */
  async getOnlineFriends(userId) {
    const friendIds = await getFriendIds(userId);
    return friendIds.filter(isVisibleOnline);
  },

  /** Two users just became friends → show each other's presence immediately */
  announceNewFriendship(a, b) {
    const [ida, idb] = [a.toString(), b.toString()];
    if (isVisibleOnline(ida)) emitToUsers([idb], "user-online", ida);
    if (isVisibleOnline(idb)) emitToUsers([ida], "user-online", idb);
  },

  /** Friendship removed → stop showing each other as online */
  announceFriendshipRemoved(a, b) {
    const [ida, idb] = [a.toString(), b.toString()];
    emitToUsers([idb], "user-offline", ida);
    emitToUsers([ida], "user-offline", idb);
  },
};
