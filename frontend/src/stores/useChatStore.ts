import { create } from "zustand";
import type { ChatState } from "@/types/store";

/**
 * Chat UI state only: which conversation is open + who is typing.
 * Conversations & messages are server state → TanStack Query (src/hooks).
 */

// Typing indicator tự hết hạn nếu không nhận thêm "user-typing"
// (người gửi throttle 2s/lần; mất "stop-typing" do rớt mạng vẫn tự dọn).
const TYPING_TIMEOUT_MS = 6000;
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const typingKey = (conversationId: string, userId: string) => `${conversationId}:${userId}`;
const clearAllTypingTimers = () => {
  typingTimers.forEach(clearTimeout);
  typingTimers.clear();
};

export const useChatStore = create<ChatState>((set, get) => ({
  selectedConversationId: null,
  typingUsers: {},

  selectConversation: (id) => set({ selectedConversationId: id }),

  setTyping: (conversationId, userId, displayName) => {
    const key = typingKey(conversationId, userId);
    clearTimeout(typingTimers.get(key));
    typingTimers.set(
      key,
      setTimeout(() => get().removeTyping(conversationId, userId), TYPING_TIMEOUT_MS)
    );

    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      if (current.some((u) => u.userId === userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, { userId, displayName }],
        },
      };
    });
  },

  removeTyping: (conversationId, userId) => {
    const key = typingKey(conversationId, userId);
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);

    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      if (!current.some((u) => u.userId === userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current.filter((u) => u.userId !== userId),
        },
      };
    });
  },

  clearTyping: () => {
    clearAllTypingTimers();
    set({ typingUsers: {} });
  },

  reset: () => {
    clearAllTypingTimers();
    set({ selectedConversationId: null, typingUsers: {} });
  },
}));
