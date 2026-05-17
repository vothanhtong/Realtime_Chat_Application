/**
 * In-memory presence service for real-time user tracking.
 *
 * Rules:
 *   isOnline      = has active socket connection (tracked here)
 *   statusVisible = DB user preference ONLY (never modified here)
 */

// userId → number of active socket connections (supports multi-tab)
const connectionCounts = new Map();

// Set of currently online userIds (string)
const onlineUsers = new Set();

// userId → boolean visibility preference (synced from DB on connect)
const userVisibility = new Map();

export const presenceService = {
  /**
   * Track a new connection and emit 'user-online' event
   */
  handleConnection: async (io, userId, statusVisible) => {
    const prev = connectionCounts.get(userId) || 0;
    connectionCounts.set(userId, prev + 1);

    // Sync visibility preference from DB
    userVisibility.set(userId, statusVisible !== false);

    if (prev === 0) {
      // First connection — user just came online
      onlineUsers.add(userId);
      io.emit("user-online", userId);
    }
  },

  /**
   * Handle socket disconnection and emit 'user-offline' event
   */
  handleDisconnect: async (io, userId) => {
    const count = (connectionCounts.get(userId) || 1) - 1;

    if (count <= 0) {
      // Last connection closed — user is offline
      connectionCounts.delete(userId);
      onlineUsers.delete(userId);
      userVisibility.delete(userId);
      io.emit("user-offline", userId);
    } else {
      // Still has other tabs/connections open
      connectionCounts.set(userId, count);
    }
  },

  /**
   * Update visibility preference (Incognito Mode toggle)
   * Only updates the in-memory cache — DB is the source of truth
   */
  updateVisibility: async (_io, userId, visible) => {
    userVisibility.set(userId, visible);
  },

  /**
   * Get the current list of online user IDs
   */
  getOnlineUsers: async () => {
    return [...onlineUsers];
  },
};
