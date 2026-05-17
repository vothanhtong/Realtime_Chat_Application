import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import { useFriendStore } from "./useFriendStore";
import { toast } from "sonner";

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  connectSocket: () => {
    const accessToken = useAuthStore.getState().accessToken;
    const existingSocket = get().socket;

    if (existingSocket?.connected) return; // tránh tạo nhiều socket

    // Disconnect socket cũ nếu tồn tại nhưng không connected
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socket: Socket = io(baseURL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"], // Thêm polling fallback
      reconnection: true, // Auto reconnect
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    set({ socket });

    socket.on("connect", () => {
      // connected
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    // online users
    socket.on("online-users", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("user-online", (userId) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.includes(userId)
          ? state.onlineUsers
          : [...state.onlineUsers, userId],
      }));
    });

    socket.on("user-offline", (userId) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      }));
    });

    // profile sync
    socket.on("user-updated", (data) => {
      const { userId, ...updates } = data;
      useChatStore.getState().updateParticipantInfo(userId, updates);
      useFriendStore.getState().updateFriendInfo(userId, updates);
      
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser._id === userId) {
        useAuthStore.getState().setUser({ ...currentUser, ...updates });
      }
    });

    // new message
    socket.on("new-message", ({ message, conversation, unreadCounts }) => {
      useChatStore.getState().addMessage(message);

      const updatedConversation = {
        ...conversation,
        lastMessage: conversation.lastMessage,
        seenBy: conversation.seenBy || [],
        unreadCounts,
      };

      if (useChatStore.getState().activeConversationId === message.conversationId) {
        useChatStore.getState().markAsSeen();
      }

      useChatStore.getState().updateConversation(updatedConversation);
    });

    // read message — backend emits: { conversationId, seenBy, lastMessage }
    socket.on("read-message", ({ conversationId, seenBy, lastMessage }) => {
      const updated = {
        _id: conversationId,
        lastMessage,
        seenBy,
      };
      useChatStore.getState().updateConversation(updated);
    });

    // new group chat
    socket.on("new-group", (conversation) => {
      useChatStore.getState().addConvo(conversation);
      socket.emit("join-conversation", conversation._id);
    });

    // new friend request
    socket.on("new-friend-request", ({ from }) => {
      toast.info(`Bạn nhận được lời mời kết bạn từ ${from.displayName}`);
      useFriendStore.getState().getAllFriendRequests();
    });

    // friend request accepted
    socket.on("friend-request-accepted", ({ acceptedBy }) => {
      toast.success(`${acceptedBy.displayName} đã chấp nhận lời mời kết bạn!`);
      useFriendStore.getState().getFriends();
    });

    // message recalled
    socket.on("message-recalled", ({ messageId, conversationId, content }) => {
      const chatStore = useChatStore.getState();

      chatStore.updateConversation({
        _id: conversationId,
        lastMessage: {
          content,
          _id: messageId,
        },
      });

      // Update messages list if it's open
      const convoMsgs = chatStore.messages[conversationId];
      if (convoMsgs) {
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: {
              ...convoMsgs,
              items: convoMsgs.items.map((m) =>
                m._id === messageId ? { ...m, isRecalled: true, content } : m
              ),
            },
          },
        }));
      }
    });

    // typing indicators
    socket.on("user-typing", ({ conversationId, userId, displayName }) => {
      useChatStore.getState().setTyping(conversationId, userId, displayName);
    });

    socket.on("user-stop-typing", ({ conversationId, userId }) => {
      useChatStore.getState().removeTyping(conversationId, userId);
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.removeAllListeners();
      if (socket.connected) {
        socket.disconnect();
      }
    }
    set({ socket: null, onlineUsers: [] }); // Reset onlineUsers khi disconnect
  },
}));
