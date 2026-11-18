import { useMemo } from "react";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { chatService } from "@/services/chatService";
import { queryKeys } from "@/lib/queryKeys";
import type { Message, MessagesPage } from "@/types/chat";

/** Only `pages` matters here — independent of the pageParam type */
type PagedMessages = { pages: MessagesPage[] } | undefined;

/**
 * Message history with cursor pagination (useInfiniteQuery).
 * pages[0] = newest page; fetchNextPage() loads OLDER messages.
 * New realtime messages are appended to pages[0] by lib/chatCache.appendMessage.
 */
export const messagesQueryOptions = (conversationId: string | null) =>
  infiniteQueryOptions({
    queryKey: queryKeys.messages(conversationId ?? "none"),
    queryFn: ({ pageParam }) => chatService.fetchMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!conversationId,
    // Socket giữ cache luôn mới; reconnect không khôi phục được → invalidate (handlers.ts)
    staleTime: Infinity,
  });

/** Chronological list. Message objects keep identity across updates (structural sharing). */
export const flattenMessages = (data: PagedMessages): Message[] =>
  data ? [...data.pages].reverse().flatMap((p) => p.messages) : [];

/**
 * Messages in OLDER pages = items prepended above the first page.
 * Virtuoso firstItemIndex = START - prependedCount keeps the scroll position.
 */
export const countPrepended = (data: PagedMessages): number =>
  data ? data.pages.slice(1).reduce((n, p) => n + p.messages.length, 0) : 0;

export const useMessages = (conversationId: string | null) => {
  const query = useInfiniteQuery(messagesQueryOptions(conversationId));
  const { data } = query;

  // → React.memo(MessageItem) skips unchanged rows
  const items = useMemo(() => flattenMessages(data), [data]);
  const prependedCount = useMemo(() => countPrepended(data), [data]);

  return {
    items,
    prependedCount,
    isInitialLoading: query.isPending && !!conversationId,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    isError: query.isError && !data,
    isRefetching: query.isRefetching,
    fetchOlder: query.fetchNextPage,
    refetch: query.refetch,
  };
};
