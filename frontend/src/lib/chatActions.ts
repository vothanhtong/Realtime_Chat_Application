import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/stores/useAuthStore";
import { getUnreadCount, resetUnread } from "./chatCache";

/**
 * Chat actions shared by React (open a conversation) and the socket layer
 * (new message arrives in the open conversation).
 */

const inFlight = new Set<string>();
// Gọi lại trong lúc request đang chạy (vd: tin mới tới) → chạy thêm MỘT lần sau
// đó, để server không giữ unread = 1 trong khi UI đã về 0.
const rerun = new Set<string>();

/** Mark a conversation as seen if the current user has unread messages in it */
export const markConversationSeen = async (
  conversationId: string,
  force = false // lần chạy lại: bỏ qua kiểm tra cache (cache vừa bị reset về 0)
): Promise<void> => {
  const myId = useAuthStore.getState().user?._id;
  if (!myId) return;
  if (inFlight.has(conversationId)) {
    rerun.add(conversationId);
    return;
  }
  if (!force && getUnreadCount(conversationId, myId) === 0) return;

  inFlight.add(conversationId);
  try {
    await chatService.markAsSeen(conversationId);
    resetUnread(conversationId, myId);
  } catch (error) {
    console.error("markConversationSeen error:", error);
  } finally {
    inFlight.delete(conversationId);
    if (rerun.delete(conversationId)) void markConversationSeen(conversationId, true);
  }
};
