import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { chatService } from "@/services/chatService";
import { addConversation, appendMessage, applyRecall, removeMessage } from "@/lib/chatCache";
import { getErrorMessage } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { sendMessageViaSocket } from "@/realtime/socketClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";

interface SendInput {
  conversation: Conversation;
  content: string;
  imgUrl?: string;
}

/** Socket first (ack), REST fallback when disconnected */
export const useSendMessage = () =>
  useMutation({
    mutationFn: async ({ conversation, content, imgUrl }: SendInput) => {
      const myId = useAuthStore.getState().user?._id;
      const isDirect = conversation.type === "direct";
      const recipientId = isDirect
        ? conversation.participants.find((p) => p._id !== myId)?._id
        : undefined;

      const payload = {
        type: conversation.type,
        conversationId: conversation._id,
        recipientId,
        content,
        imgUrl,
      };

      const viaSocket = sendMessageViaSocket(payload);
      if (viaSocket) return viaSocket;

      // REST: socket đang ngắt → sẽ không nhận broadcast của chính mình,
      // nên tự chèn tin vào cache và làm mới sidebar.
      const message = isDirect
        ? await chatService.sendDirectMessage(recipientId!, content, imgUrl, conversation._id)
        : await chatService.sendGroupMessage(conversation._id, content, imgUrl);
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      return message;
    },
    // Ack/REST trả về tin đã lưu → chèn ngay (appendMessage tự bỏ trùng với broadcast)
    onSuccess: (message) => appendMessage(message),
  });

export const useCreateConversation = () =>
  useMutation({
    mutationFn: ({ type, name, memberIds }: { type: "direct" | "group"; name: string; memberIds: string[] }) =>
      chatService.createConversation(type, name, memberIds),
    onSuccess: (conversation) => {
      addConversation(conversation);
      // Server đã join socket vào phòng mới — chỉ cần mở nó
      useChatStore.getState().selectConversation(conversation._id);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Không thể tạo cuộc trò chuyện")),
  });

export const useRecallMessage = () =>
  useMutation({
    mutationFn: ({ messageId }: { conversationId: string; messageId: string }) =>
      chatService.recallMessage(messageId),
    onSuccess: (_data, { conversationId, messageId }) =>
      applyRecall(conversationId, messageId, "Tin nhắn đã bị thu hồi"),
    onError: (error) => toast.error(getErrorMessage(error, "Thu hồi tin nhắn thất bại")),
  });

export const useDeleteMessage = () =>
  useMutation({
    mutationFn: ({ messageId }: { conversationId: string; messageId: string }) =>
      chatService.deleteMessage(messageId),
    onSuccess: (_data, { conversationId, messageId }) => removeMessage(conversationId, messageId),
    onError: (error) => toast.error(getErrorMessage(error, "Xóa tin nhắn thất bại")),
  });
