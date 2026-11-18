import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import {
  addConversation,
  appendMessage,
  applyRecall,
  patchConversation,
  patchUserEverywhere,
  removeConversation,
  setSeenBy,
} from "@/lib/chatCache";
import { markConversationSeen } from "@/lib/chatActions";
import { withCacheBust } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSocketStore } from "@/stores/useSocketStore";
import type { Conversation, LastMessage, Message, SeenUser } from "@/types/chat";

/**
 * Socket event → cache/store mapping. Server state goes into the TanStack Query
 * cache via lib/chatCache (same writers the mutations use); UI state goes into
 * the Zustand stores. Nothing here renders or imports React.
 */

interface NewMessagePayload {
  message: Message;
  conversation: { _id: string; lastMessage: LastMessage; lastMessageAt: string; seenBy: SeenUser[] };
  unreadCounts: Record<string, number>;
}

type UserUpdatedPayload = {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  statusVisible?: boolean;
};

/** After a reconnect that could not restore server state: refetch what may be stale */
export const resyncAfterReconnect = () => {
  useChatStore.getState().clearTyping();
  void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
  void queryClient.invalidateQueries({ queryKey: queryKeys.allMessages });
  void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
};

export const registerSocketHandlers = (socket: Socket) => {
  const presence = useSocketStore.getState;
  const chat = useChatStore.getState;

  // ─── Presence (server already scopes these to friends) ─────────────────────
  socket.on("online-users", (userIds: string[]) => presence().setOnlineUsers(userIds));
  socket.on("user-online", (userId: string) => presence().addOnlineUser(userId));
  socket.on("user-offline", (userId: string) => presence().removeOnlineUser(userId));

  // ─── Profile sync ──────────────────────────────────────────────────────────
  socket.on("user-updated", ({ userId, ...patch }: UserUpdatedPayload) => {
    patchUserEverywhere(userId, patch);
    const me = useAuthStore.getState().user;
    if (me && me._id === userId) {
      useAuthStore
        .getState()
        .patchUser(patch.avatarUrl ? { ...patch, avatarUrl: withCacheBust(patch.avatarUrl) } : patch);
    }
  });

  // ─── Messages ──────────────────────────────────────────────────────────────
  socket.on("new-message", ({ message, conversation, unreadCounts }: NewMessagePayload) => {
    appendMessage(message);
    // patchConversation cũng sắp xếp lại sidebar theo lastMessageAt
    patchConversation({
      _id: conversation._id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      seenBy: conversation.seenBy || [],
      unreadCounts,
    });
    // Người gửi vừa gửi xong → không còn "đang soạn tin"
    chat().removeTyping(message.conversationId, message.senderId);

    if (chat().selectedConversationId === message.conversationId) {
      void markConversationSeen(message.conversationId);
    }
  });

  socket.on(
    "read-message",
    ({ conversationId, seenBy }: { conversationId: string; seenBy: (string | SeenUser)[] }) =>
      // Không ghi đè lastMessage: bản server gửi ở đây chưa populate sender
      setSeenBy(conversationId, seenBy)
  );

  socket.on(
    "message-recalled",
    ({ messageId, conversationId, content }: { messageId: string; conversationId: string; content: string }) =>
      applyRecall(conversationId, messageId, content)
  );

  // ─── Conversations ─────────────────────────────────────────────────────────
  // Server đã tự join socket vào phòng mới (server-side join) — chỉ cần cập nhật cache
  socket.on("new-group", (conversation: Conversation) => addConversation(conversation));

  socket.on("conversation-deleted", ({ conversationId }: { conversationId: string }) => {
    removeConversation(conversationId);
    if (chat().selectedConversationId === conversationId) chat().selectConversation(null);
  });

  // ─── Friends ───────────────────────────────────────────────────────────────
  socket.on("new-friend-request", ({ from }: { from: { displayName: string } }) => {
    toast.info(`Bạn nhận được lời mời kết bạn từ ${from.displayName}`);
    void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
  });

  socket.on("friend-request-accepted", ({ acceptedBy }: { acceptedBy: { displayName: string } }) => {
    toast.success(`${acceptedBy.displayName} đã chấp nhận lời mời kết bạn!`);
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
    void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
  });

  // ─── Typing ────────────────────────────────────────────────────────────────
  socket.on(
    "user-typing",
    ({ conversationId, userId, displayName }: { conversationId: string; userId: string; displayName: string }) =>
      chat().setTyping(conversationId, userId, displayName)
  );
  socket.on("user-stop-typing", ({ conversationId, userId }: { conversationId: string; userId: string }) =>
    chat().removeTyping(conversationId, userId)
  );
};
