import { useCallback } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { chatService } from "@/services/chatService";
import { queryKeys } from "@/lib/queryKeys";
import { sortConversations } from "@/lib/chatCache";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";

/**
 * Conversation list — server state in the query cache, kept live by socket
 * events (src/realtime/handlers.ts → lib/chatCache).
 */
export const conversationsQuery = queryOptions({
  queryKey: queryKeys.conversations,
  queryFn: async () => sortConversations(await chatService.fetchConversations()),
});

/**
 * `select` lets each consumer subscribe to just the slice it renders; with
 * structural sharing, components only re-render when that slice changes.
 */
export const useConversations = <T = Conversation[]>(select?: (list: Conversation[]) => T) =>
  useQuery({ ...conversationsQuery, select });

// Stable (module-level) selectors → TanStack memoises the result
const selectDirect = (list: Conversation[]) => list.filter((c) => c.type === "direct");
const selectGroups = (list: Conversation[]) => list.filter((c) => c.type === "group");

export const useDirectConversations = () => useConversations(selectDirect);
export const useGroupConversations = () => useConversations(selectGroups);

/** The open conversation (null when none selected / not in the list) */
export const useSelectedConversation = (): Conversation | null => {
  const id = useChatStore((s) => s.selectedConversationId);
  const select = useCallback(
    (list: Conversation[]) => (id ? list.find((c) => c._id === id) ?? null : null),
    [id]
  );
  return useConversations(select).data ?? null;
};
