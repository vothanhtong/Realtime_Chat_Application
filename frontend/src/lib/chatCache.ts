import type { InfiniteData } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";
import { withCacheBust } from "./utils";
import type { Conversation, LastMessage, Message, MessagesPage, SeenUser } from "@/types/chat";
import type { Friend } from "@/types/user";

/**
 * Cache writers for server state — the ONLY place that mutates query data.
 * Used by mutation hooks (src/hooks) and socket handlers (src/realtime), so a
 * realtime event and a local action always produce the same cache shape.
 *
 * Messages cache: InfiniteData<MessagesPage>, pages[0] = NEWEST page,
 * each page's messages in chronological order.
 */

export type MessagesData = InfiniteData<MessagesPage, string | undefined>;

const toTime = (value?: string | null) => (value ? new Date(value).getTime() || 0 : 0);

/** Sidebar order: most recent activity first */
export const sortConversations = (list: Conversation[]) =>
  [...list].sort(
    (a, b) =>
      toTime(b.lastMessageAt ?? b.updatedAt ?? b.createdAt) -
      toTime(a.lastMessageAt ?? a.updatedAt ?? a.createdAt)
  );

const setConversations = (updater: (list: Conversation[]) => Conversation[]) =>
  queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (old) =>
    old ? updater(old) : old
  );

const setMessages = (conversationId: string, updater: (data: MessagesData) => MessagesData) =>
  queryClient.setQueryData<MessagesData>(queryKeys.messages(conversationId), (old) =>
    old ? updater(old) : old
  );

// ─── Conversations ────────────────────────────────────────────────────────────

/** Add a full conversation (new-group / created locally); merge if it already exists */
export const addConversation = (conversation: Conversation) => {
  const list = queryClient.getQueryData<Conversation[]>(queryKeys.conversations);
  if (!list) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    return;
  }
  setConversations((old) =>
    sortConversations(
      old.some((c) => c._id === conversation._id)
        ? old.map((c) => (c._id === conversation._id ? { ...c, ...conversation } : c))
        : [conversation, ...old]
    )
  );
};

/** Merge a partial update into a known conversation (unknown id → refetch list) */
export const patchConversation = (patch: Partial<Conversation> & { _id: string }) => {
  const list = queryClient.getQueryData<Conversation[]>(queryKeys.conversations);
  if (list && !list.some((c) => c._id === patch._id)) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    return;
  }
  setConversations((old) =>
    sortConversations(old.map((c) => (c._id === patch._id ? { ...c, ...patch } : c)))
  );
};

export const removeConversation = (conversationId: string) => {
  setConversations((old) => old.filter((c) => c._id !== conversationId));
  queryClient.removeQueries({ queryKey: queryKeys.messages(conversationId) });
};

export const setSeenBy = (conversationId: string, seenBy: (string | SeenUser)[]) =>
  setConversations((old) =>
    old.map((c) =>
      c._id === conversationId
        ? // read-message gửi mảng id thô → chuẩn hoá về { _id } như lúc fetch
          { ...c, seenBy: (seenBy ?? []).map((u) => (typeof u === "string" ? { _id: u } : u)) }
        : c
    )
  );

export const resetUnread = (conversationId: string, userId: string) =>
  setConversations((old) =>
    old.map((c) =>
      c._id === conversationId && (c.unreadCounts?.[userId] ?? 0) !== 0
        ? { ...c, unreadCounts: { ...c.unreadCounts, [userId]: 0 } }
        : c
    )
  );

export const getUnreadCount = (conversationId: string, userId: string) =>
  queryClient
    .getQueryData<Conversation[]>(queryKeys.conversations)
    ?.find((c) => c._id === conversationId)?.unreadCounts?.[userId] ?? 0;

// ─── Messages ─────────────────────────────────────────────────────────────────

/**
 * Append a message to an already-loaded conversation (dedupe by _id).
 * If the conversation's history was never loaded we do NOTHING — opening it
 * later fetches a fresh first page (this is what fixed "opening a room shows
 * only the one realtime message").
 */
export const appendMessage = (message: Message) =>
  setMessages(message.conversationId, (data) => {
    if (data.pages.some((p) => p.messages.some((m) => m._id === message._id))) return data;
    const [newest, ...older] = data.pages;
    return {
      ...data,
      pages: [{ ...newest, messages: [...newest.messages, message] }, ...older],
    };
  });

const mapMessage = (
  conversationId: string,
  messageId: string,
  fn: (m: Message) => Message | null
) =>
  setMessages(conversationId, (data) => ({
    ...data,
    pages: data.pages.map((page) =>
      page.messages.some((m) => m._id === messageId)
        ? {
            ...page,
            messages: page.messages.flatMap((m) => {
              if (m._id !== messageId) return [m];
              const next = fn(m);
              return next ? [next] : [];
            }),
          }
        : page
    ),
  }));

/** Delete-for-me */
export const removeMessage = (conversationId: string, messageId: string) =>
  mapMessage(conversationId, messageId, () => null);

/** Recall: update the bubble, and the sidebar preview only if it was the last message */
export const applyRecall = (conversationId: string, messageId: string, content: string) => {
  mapMessage(conversationId, messageId, (m) => ({ ...m, isRecalled: true, content, imgUrl: null }));
  setConversations((old) =>
    old.map((c) =>
      c._id === conversationId && c.lastMessage?._id === messageId
        ? { ...c, lastMessage: { ...(c.lastMessage as LastMessage), content } }
        : c
    )
  );
};

// ─── Users (profile sync) ─────────────────────────────────────────────────────

type UserPatch = Partial<{ displayName: string; avatarUrl: string; statusVisible: boolean }>;

/** Apply a "user-updated" patch to every cached place that renders that user */
export const patchUserEverywhere = (userId: string, patch: UserPatch) => {
  const updates = patch.avatarUrl ? { ...patch, avatarUrl: withCacheBust(patch.avatarUrl) } : patch;

  setConversations((old) =>
    old.map((c) =>
      c.participants.some((p) => p._id === userId)
        ? {
            ...c,
            participants: c.participants.map((p) => (p._id === userId ? { ...p, ...updates } : p)),
          }
        : c
    )
  );

  queryClient.setQueryData<Friend[]>(queryKeys.friends, (old) =>
    old?.map((f) => (f._id === userId ? { ...f, ...updates } : f))
  );
};
