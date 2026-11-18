import ChatWelcomeScreen from "./ChatWelcomeScreen";
import { SidebarInset } from "../ui/sidebar";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowBody from "./ChatWindowBody";
import MessageInput from "./MessageInput";
import { useEffect } from "react";
import ChatWindowSkeleton from "../skeleton/ChatWindowSkeleton";
import ConnectionBanner from "./ConnectionBanner";
import { SlowServerHint } from "../common/QueryStates";
import { useSelectedConversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { markConversationSeen } from "@/lib/chatActions";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatWindowLayout = () => {
  const selectedConvo = useSelectedConversation();
  const conversationId = selectedConvo?._id ?? null;
  const myId = useAuthStore((s) => s.user?._id);
  const myUnread = (myId && selectedConvo?.unreadCounts?.[myId]) || 0;

  // Lịch sử tin nhắn (useInfiniteQuery) — tự tải khi phòng được chọn
  const messages = useMessages(conversationId);

  // Mở phòng / có tin chưa đọc trong phòng đang mở → đánh dấu đã xem
  useEffect(() => {
    if (conversationId && myUnread > 0) void markConversationSeen(conversationId);
  }, [conversationId, myUnread]);

  // Banner mất kết nối luôn nằm trên cùng, ở MỌI trạng thái của khung chat
  const withBanner = (content: React.ReactNode) => (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      <ConnectionBanner />
      {content}
    </div>
  );

  if (!selectedConvo) {
    return withBanner(<ChatWelcomeScreen />);
  }

  // Skeleton toàn màn hình CHỈ khi tải trang đầu. Tải thêm tin cũ (isFetchingMore)
  // không unmount Virtuoso → giữ vị trí cuộn.
  if (messages.isInitialLoading) {
    return withBanner(
      <>
        <ChatWindowSkeleton />
        <SlowServerHint className="py-2" />
      </>
    );
  }

  return withBanner(
    <SidebarInset className="flex flex-col h-full flex-1 overflow-hidden rounded-none md:rounded-sm shadow-md">
      {/* Header */}
      <ChatWindowHeader chat={selectedConvo} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-primary-foreground">
        <ChatWindowBody
          conversation={selectedConvo}
          messages={messages}
        />
      </div>

      {/* Footer */}
      <MessageInput selectedConvo={selectedConvo} />
    </SidebarInset>
  );
};

export default ChatWindowLayout;
