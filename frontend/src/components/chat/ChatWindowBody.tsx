import { useCallback, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Loader2, MessageSquareDashed } from "lucide-react";
import MessageItem from "./MessageItem";
import ImagePreview from "./ImagePreview";
import { EmptyState, ErrorState } from "../common/QueryStates";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDeleteMessage, useRecallMessage } from "@/hooks/useChatMutations";
import type { useMessages } from "@/hooks/useMessages";
import type { Conversation, Participant } from "@/types/chat";

// Virtuoso cần firstItemIndex GIẢM đúng bằng số item chèn lên đầu thì mới giữ
// nguyên vị trí cuộn khi prepend. Bắt đầu từ một số lớn để có "chỗ" lùi về.
const START_INDEX = 1_000_000;

interface ListContext {
  isFetchingMore: boolean;
}

/** Spinner ở đầu danh sách khi đang tải tin cũ — cờ đi qua `context` của Virtuoso */
const LoadingOlderHeader = ({ context }: { context?: ListContext }) =>
  context?.isFetchingMore ? (
    <div className="flex justify-center py-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
    </div>
  ) : null;

// Tham chiếu ổn định — component mới mỗi render khiến Virtuoso remount header
const VIRTUOSO_COMPONENTS = { Header: LoadingOlderHeader };

interface ChatWindowBodyProps {
  conversation: Conversation;
  messages: ReturnType<typeof useMessages>;
}

const ChatWindowBody = ({ conversation, messages }: ChatWindowBodyProps) => {
  const myId = useAuthStore((s) => s.user?._id);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { items, prependedCount, isFetchingMore, hasMore, fetchOlder, isError, isRefetching, refetch } =
    messages;
  const conversationId = conversation._id;

  const recall = useRecallMessage();
  const remove = useDeleteMessage();
  // Callback ổn định (mutate của TanStack là stable) → không phá React.memo của MessageItem
  const { mutate: recallMutate } = recall;
  const { mutate: removeMutate } = remove;
  const handleRecall = useCallback(
    (messageId: string) => recallMutate({ conversationId, messageId }),
    [recallMutate, conversationId]
  );
  const handleDelete = useCallback(
    (messageId: string) => removeMutate({ conversationId, messageId }),
    [removeMutate, conversationId]
  );

  // senderId → participant (tra cứu O(1), tham chiếu ổn định khi participants không đổi)
  const participantsById = useMemo(
    () => new Map<string, Participant>(conversation.participants.map((p) => [p._id, p])),
    [conversation.participants]
  );

  // "Đã xem" khi có người KHÁC mình trong seenBy
  const lastMessageStatus: "delivered" | "seen" =
    conversation.lastMessage && myId &&
    (conversation.seenBy ?? []).some((seenUser) => seenUser._id !== myId)
      ? "seen"
      : "delivered";
  const lastMessageId = conversation.lastMessage?._id;

  const firstItemIndex = START_INDEX - prependedCount;

  const loadOlder = useCallback(() => {
    if (hasMore && !isFetchingMore) void fetchOlder();
  }, [hasMore, isFetchingMore, fetchOlder]);

  const listContext = useMemo<ListContext>(() => ({ isFetchingMore }), [isFetchingMore]);

  if (isError) {
    return (
      <ErrorState
        className="h-full"
        message="Không tải được tin nhắn."
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        className="h-full"
        icon={<MessageSquareDashed className="size-10" />}
        title="Chưa có tin nhắn nào"
        description="Hãy gửi lời chào đầu tiên 👋"
      />
    );
  }

  return (
    <div className="p-3 md:p-5 xl:p-6 bg-primary-foreground h-full overflow-hidden flex flex-col">
      <Virtuoso<(typeof items)[number], ListContext>
        // Remount theo phòng: initialTopMostItemIndex / firstItemIndex bắt đầu lại
        key={conversationId}
        data={items}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={items.length - 1}
        followOutput="smooth"
        startReached={loadOlder}
        atBottomThreshold={100}
        increaseViewportBy={200}
        components={VIRTUOSO_COMPONENTS}
        context={listContext}
        computeItemKey={(_index, message) => message._id}
        className="beautiful-scrollbar overflow-x-hidden"
        itemContent={(absoluteIndex, message) => {
          // Với firstItemIndex, index Virtuoso truyền vào là index "tuyệt đối"
          const index = absoluteIndex - firstItemIndex;
          const isOwn = message.senderId === myId;
          return (
            <MessageItem
              message={message}
              prevMessage={index > 0 ? items[index - 1] : undefined}
              isOwn={isOwn}
              participant={isOwn ? undefined : participantsById.get(message.senderId)}
              // Chỉ tin cuối của mình mới nhận status → các tin khác giữ props ổn định
              status={isOwn && message._id === lastMessageId ? lastMessageStatus : undefined}
              onImageClick={setPreviewUrl}
              onRecall={handleRecall}
              onDelete={handleDelete}
            />
          );
        }}
      />

      <ImagePreview
        src={previewUrl}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  );
};

export default ChatWindowBody;
