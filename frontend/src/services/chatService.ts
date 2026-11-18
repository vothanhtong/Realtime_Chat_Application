import api from "@/lib/axios";
import type { Conversation, Message, MessagesPage } from "@/types/chat";

const pageLimit = 50;

export const chatService = {
  async fetchConversations(): Promise<Conversation[]> {
    const res = await api.get<{ conversations: Conversation[] }>("/conversations");
    return res.data.conversations;
  },

  /** One page (chronological), newest page first; nextCursor = null when exhausted */
  async fetchMessages(id: string, cursor?: string): Promise<MessagesPage> {
    const res = await api.get<MessagesPage>(`/conversations/${id}/messages`, {
      params: { limit: pageLimit, ...(cursor ? { cursor } : {}) },
    });
    return { messages: res.data.messages, nextCursor: res.data.nextCursor ?? null };
  },

  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    imgUrl?: string,
    conversationId?: string
  ): Promise<Message> {
    const res = await api.post<{ message: Message }>("/messages/direct", {
      recipientId,
      content,
      imgUrl,
      conversationId,
    });

    return res.data.message;
  },

  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    imgUrl?: string
  ): Promise<Message> {
    const res = await api.post<{ message: Message }>("/messages/group", {
      conversationId,
      content,
      imgUrl,
    });
    return res.data.message;
  },

  async markAsSeen(conversationId: string) {
    const res = await api.patch(`/conversations/${conversationId}/seen`);
    return res.data;
  },

  async deleteMessage(messageId: string) {
    const res = await api.delete(`/messages/${messageId}`);
    return res.data;
  },

  async recallMessage(messageId: string) {
    const res = await api.post(`/messages/${messageId}/recall`);
    return res.data;
  },

  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ): Promise<Conversation> {
    const res = await api.post<{ conversation: Conversation }>("/conversations", {
      type,
      name,
      memberIds,
    });
    return res.data.conversation;
  },
};
