/** Centralised query keys — the only place cache keys are spelled out */
export const queryKeys = {
  conversations: ["conversations"] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  allMessages: ["messages"] as const,
  friends: ["friends"] as const,
  friendRequests: ["friend-requests"] as const,
};
