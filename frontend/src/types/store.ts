import type { Socket } from "socket.io-client";
import type { Conversation, Message } from "./chat";
import type { Friend, FriendRequest, User } from "./user";

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;

  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearState: () => void;
  signUp: (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export interface ChatState {
  conversations: Conversation[];
  messages: Record<
    string,
    {
      items: Message[];
      hasMore: boolean; // infinite-scroll
      nextCursor?: string | null; // phân trang
    }
  >;
  activeConversationId: string | null;
  convoLoading: boolean;
  messageLoading: boolean;
  loading: boolean;
  typingUsers: Record<string, { userId: string; displayName: string }[]>;
  reset: () => void;

  setActiveConversation: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId?: string) => Promise<void>;
  sendDirectMessage: (
    recipientId: string,
    content: string,
    imgUrl?: string
  ) => Promise<void>;
  sendGroupMessage: (
    conversationId: string,
    content: string,
    imgUrl?: string
  ) => Promise<void>;
  // add message
  addMessage: (message: Message) => Promise<void>;
  // update convo
  updateConversation: (conversation: unknown) => void;
  markAsSeen: () => Promise<void>;
  addConvo: (convo: Conversation) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  recallMessage: (messageId: string) => Promise<void>;
  setTyping: (conversationId: string, userId: string, displayName: string) => void;
  removeTyping: (conversationId: string, userId: string) => void;
  createConversation: (
    type: "group" | "direct",
    name: string,
    memberIds: string[]
  ) => Promise<void>;
  updateParticipantInfo: (
    userId: string,
    data: Partial<{ displayName: string; avatarUrl: string; statusVisible: boolean }>
  ) => void;
}

export interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export interface FriendState {
  friends: Friend[];
  loading: boolean;
  receivedList: FriendRequest[];
  sentList: FriendRequest[];
  searchByUsername: (username: string) => Promise<User | null>;
  addFriend: (to: string, message?: string) => Promise<string>;
  getAllFriendRequests: () => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  getFriends: () => Promise<void>;
  unfriend: (friendId: string) => Promise<void>;
  updateFriendInfo: (
    userId: string,
    data: Partial<{ displayName: string; avatarUrl: string; statusVisible: boolean }>
  ) => void;
}

export interface UserState {
  updateAvatarUrl: (formData: FormData) => Promise<void>;
  updateProfile: (data: { displayName?: string; bio?: string; phone?: string }) => Promise<void>;
  updateStatusVisibility: (visible: boolean) => Promise<void>;
}
