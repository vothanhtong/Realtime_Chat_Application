import { create } from "zustand";
import type { SocketState } from "@/types/store";

/**
 * Realtime connection state only. The Socket.IO instance and its event
 * handlers live in src/realtime/ (they write into this store, never the reverse).
 */
export const useSocketStore = create<SocketState>((set) => ({
  status: "disconnected",
  hasEverConnected: false,
  onlineUsers: [],

  setStatus: (status) =>
    set((state) => ({
      status,
      hasEverConnected: state.hasEverConnected || status === "connected",
    })),
  setOnlineUsers: (userIds) => set({ onlineUsers: [...new Set(userIds)] }),
  addOnlineUser: (userId) =>
    set((state) =>
      state.onlineUsers.includes(userId) ? state : { onlineUsers: [...state.onlineUsers, userId] }
    ),
  removeOnlineUser: (userId) =>
    set((state) =>
      state.onlineUsers.includes(userId)
        ? { onlineUsers: state.onlineUsers.filter((id) => id !== userId) }
        : state
    ),
  reset: () => set({ status: "disconnected", hasEverConnected: false, onlineUsers: [] }),
}));
