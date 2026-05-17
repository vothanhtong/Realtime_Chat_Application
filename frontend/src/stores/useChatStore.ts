import { chatService } from "@/services/chatService";
import type { ChatState } from "@/types/store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";
import { useSocketStore } from "./useSocketStore";

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
      let isMarkingAsSeen = false;

      return {
        conversations: [],
        messages: {},
        activeConversationId: null,
        convoLoading: false, // convo loading
        messageLoading: false,
        loading: false,
        typingUsers: {},

        setActiveConversation: (id) => set({ activeConversationId: id }),
        reset: () => {
          set({
            conversations: [],
            messages: {},
            activeConversationId: null,
            convoLoading: false,
            messageLoading: false,
            typingUsers: {},
          });
        },
        fetchConversations: async () => {
          try {
            set({ convoLoading: true });
            const { conversations } = await chatService.fetchConversations();

            set({ conversations, convoLoading: false });
          } catch (error) {
            console.error("Lỗi xảy ra khi fetchConversations:", error);
            set({ convoLoading: false });
          }
        },
        fetchMessages: async (conversationId) => {
          const { activeConversationId, messages } = get();
          const { user } = useAuthStore.getState();

          const convoId = conversationId ?? activeConversationId;

          if (!convoId) return;

          const current = messages?.[convoId];
          const nextCursor =
            current?.nextCursor === undefined ? "" : current?.nextCursor;

          if (nextCursor === null) return;

          set({ messageLoading: true });

          try {
            const { messages: fetched, cursor } = await chatService.fetchMessages(
              convoId,
              nextCursor
            );

            const processed = fetched.map((m) => ({
              ...m,
              isOwn: m.senderId === user?._id,
            }));

            set((state) => {
              const prev = state.messages[convoId]?.items ?? [];
              const merged = prev.length > 0 ? [...processed, ...prev] : processed;

              return {
                messages: {
                  ...state.messages,
                  [convoId]: {
                    items: merged,
                    hasMore: !!cursor,
                    nextCursor: cursor ?? null,
                  },
                },
              };
            });
          } catch (error) {
            console.error("Lỗi xảy ra khi fetchMessages:", error);
          } finally {
            set({ messageLoading: false });
          }
        },
        sendDirectMessage: async (recipientId, content, imgUrl) => {
          const { socket } = useSocketStore.getState();
          const { activeConversationId } = get();

          // Try socket first for production performance
          if (socket?.connected) {
            return new Promise((resolve, reject) => {
              socket.emit(
                "send-message",
                {
                  recipientId,
                  content,
                  imgUrl,
                  conversationId: activeConversationId || undefined,
                  type: "direct",
                },
                (response: { success: boolean; message: unknown; error?: string }) => {
                  if (response.success) {
                    resolve();
                  } else {
                    console.error("Socket send error:", response.error);
                    reject(new Error(response.error));
                  }
                }
              );
            });
          }

          // Fallback to REST
          try {
            await chatService.sendDirectMessage(
              recipientId,
              content,
              imgUrl,
              activeConversationId || undefined
            );
          } catch (error) {
            console.error("Lỗi xảy ra khi gửi direct message (REST)", error);
            throw error;
          }
        },
        sendGroupMessage: async (conversationId, content, imgUrl) => {
          const { socket } = useSocketStore.getState();

          if (socket?.connected) {
            return new Promise((resolve, reject) => {
              socket.emit(
                "send-message",
                {
                  conversationId,
                  content,
                  imgUrl,
                  type: "group",
                },
                (response: { success: boolean; message: unknown; error?: string }) => {
                  if (response.success) {
                    resolve();
                  } else {
                    console.error("Socket send error:", response.error);
                    reject(new Error(response.error));
                  }
                }
              );
            });
          }

          try {
            await chatService.sendGroupMessage(conversationId, content, imgUrl);
          } catch (error) {
            console.error("Lỗi xảy ra gửi group message (REST)", error);
            throw error;
          }
        },
        addMessage: async (message) => {
          try {
            const { user } = useAuthStore.getState();
            message.isOwn = message.senderId === user?._id;

            const convoId = message.conversationId;

            set((state) => {
              const convoMsgs = state.messages[convoId] ?? {
                items: [],
                hasMore: true,
                nextCursor: undefined,
              };

              // Deduplicate
              if (convoMsgs.items.some((m) => m._id === message._id)) {
                return state;
              }

              return {
                messages: {
                  ...state.messages,
                  [convoId]: {
                    ...convoMsgs,
                    items: [...convoMsgs.items, message],
                  },
                },
              };
            });
          } catch (error) {
            console.error("Lỗi xảy khi ra add message:", error);
          }
        },
        updateConversation: (conversation) => {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === (conversation as { _id: string })._id
                ? { ...c, ...(conversation as object) }
                : c
            ),
          }));
        },
        markAsSeen: async () => {
          if (isMarkingAsSeen) return;

          try {
            const { user } = useAuthStore.getState();
            const { activeConversationId, conversations } = get();

            if (!activeConversationId || !user) {
              return;
            }

            const convo = conversations.find((c) => c._id === activeConversationId);

            if (!convo) {
              return;
            }

            if ((convo.unreadCounts?.[user._id] ?? 0) === 0) {
              return;
            }

            isMarkingAsSeen = true;
            await chatService.markAsSeen(activeConversationId);

            set((state) => ({
              conversations: state.conversations.map((c) =>
                c._id === activeConversationId && c.lastMessage
                  ? {
                      ...c,
                      unreadCounts: {
                        ...c.unreadCounts,
                        [user._id]: 0,
                      },
                    }
                  : c
              ),
            }));
          } catch (error) {
            console.error("Lỗi xảy ra khi gọi markAsSeen trong store", error);
          } finally {
            isMarkingAsSeen = false;
          }
        },
        addConvo: (convo) => {
          set((state) => {
            const exists = state.conversations.some(
              (c) => c._id.toString() === convo._id.toString()
            );

            return {
              conversations: exists
                ? state.conversations
                : [convo, ...state.conversations],
              activeConversationId: convo._id,
            };
          });
        },
        deleteMessage: async (messageId) => {
          try {
            await chatService.deleteMessage(messageId);
            set((state) => {
              const { activeConversationId } = state;
              if (!activeConversationId) return state;
              const convoMsgs = state.messages[activeConversationId];
              if (!convoMsgs) return state;
              return {
                messages: {
                  ...state.messages,
                  [activeConversationId]: {
                    ...convoMsgs,
                    items: convoMsgs.items.filter((m) => m._id !== messageId),
                  },
                },
              };
            });
          } catch (error) {
            console.error("Lỗi xảy ra khi deleteMessage:", error);
          }
        },
        recallMessage: async (messageId) => {
          try {
            await chatService.recallMessage(messageId);
            set((state) => {
              const { activeConversationId } = state;
              if (!activeConversationId) return state;
              const convoMsgs = state.messages[activeConversationId];
              if (!convoMsgs) return state;
              return {
                messages: {
                  ...state.messages,
                  [activeConversationId]: {
                    ...convoMsgs,
                    items: convoMsgs.items.map((m) =>
                      m._id === messageId
                        ? { ...m, isRecalled: true, content: "Tin nhắn đã bị thu hồi" }
                        : m
                    ),
                  },
                },
              };
            });
          } catch (error) {
            console.error("Lỗi xảy ra khi recallMessage:", error);
          }
        },
        setTyping: (conversationId, userId, displayName) => {
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
          set((state) => {
            const current = state.typingUsers[conversationId] ?? [];
            return {
              typingUsers: {
                ...state.typingUsers,
                [conversationId]: current.filter((u) => u.userId !== userId),
              },
            };
          });
        },
        createConversation: async (type, name, memberIds) => {
          try {
            set({ loading: true });
            const conversation = await chatService.createConversation(
              type,
              name,
              memberIds
            );

            get().addConvo(conversation);

            useSocketStore
              .getState()
              .socket?.emit("join-conversation", conversation._id);
          } catch (error) {
            console.error("Lỗi xảy ra khi gọi createConversation trong store", error);
          } finally {
            set({ loading: false });
          }
        },

        updateParticipantInfo: (userId: string, data: Partial<{ displayName: string; avatarUrl: string; statusVisible: boolean }>) => {
          const updates = { ...data };
          if (updates.avatarUrl) {
            updates.avatarUrl = `${updates.avatarUrl}${updates.avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
          }
          set((state) => ({
            conversations: state.conversations.map((convo) => ({
              ...convo,
              participants: convo.participants.map((p) =>
                p._id === userId ? { ...p, ...updates } : p
              ),
            })),
          }));
        },
      };
    },
    {
      name: "chat-storage",
      partialize: (state) => ({ conversations: state.conversations }),
    }
  )
);
