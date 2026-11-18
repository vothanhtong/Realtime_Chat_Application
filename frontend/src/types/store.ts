import type { User } from "./user";

/**
 * Zustand stores hold CLIENT / UI state only.
 * Server state (conversations, messages, friends, requests) lives in the
 * TanStack Query cache — see src/hooks and src/lib/chatCache.ts.
 */

export interface AuthState {
  accessToken: string | null;
  user: User | null;

  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  /** Merge fields into the current user (no-op when logged out) */
  patchUser: (patch: Partial<User>) => void;
  /** Drop the session locally. App.tsx reacts and tears down socket/cache. */
  clear: () => void;
}

export interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export interface TypingUser {
  userId: string;
  displayName: string;
}

export interface ChatState {
  selectedConversationId: string | null;
  typingUsers: Record<string, TypingUser[]>;

  selectConversation: (id: string | null) => void;
  setTyping: (conversationId: string, userId: string, displayName: string) => void;
  removeTyping: (conversationId: string, userId: string) => void;
  clearTyping: () => void;
  reset: () => void;
}

export type SocketStatus = "disconnected" | "connecting" | "connected";

export interface SocketState {
  status: SocketStatus;
  /** Đã kết nối thành công ít nhất một lần trong phiên (banner: "mất kết nối" vs "đang kết nối") */
  hasEverConnected: boolean;
  onlineUsers: string[];

  setStatus: (status: SocketStatus) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  reset: () => void;
}
