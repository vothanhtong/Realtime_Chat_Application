import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import UnreadCountBadge from "./UnreadCountBadge";
import { useSocketStore } from "@/stores/useSocketStore";

const DirectMessageCard = ({ convo }: { convo: Conversation }) => {
  const myId = useAuthStore((s) => s.user?._id);
  const otherUser = convo.participants.find((p) => p._id !== myId);

  // Selector hẹp: card chỉ re-render khi CHÍNH NÓ đổi active / người kia đổi online
  const { isActive, selectConversation } = useChatStore(
    useShallow((s) => ({
      isActive: s.selectedConversationId === convo._id,
      selectConversation: s.selectConversation,
    }))
  );
  const isOnline = useSocketStore((s) => !!otherUser && s.onlineUsers.includes(otherUser._id));

  if (!myId || !otherUser) return null;

  const unreadCount = convo.unreadCounts?.[myId] ?? 0;
  const lastMessage = convo.lastMessage?.content ?? "";

  return (
    <ChatCard
      convoId={convo._id}
      name={otherUser.displayName ?? ""}
      timestamp={
        convo.lastMessage?.createdAt
          ? new Date(convo.lastMessage.createdAt)
          : undefined
      }
      isActive={isActive}
      onSelect={selectConversation}
      unreadCount={unreadCount}
      leftSection={
        <>
          <UserAvatar
            type="sidebar"
            name={otherUser.displayName ?? ""}
            avatarUrl={otherUser.avatarUrl ?? undefined}
            statusVisible={otherUser.statusVisible}
            isOwn={false}
          />
          <StatusBadge
            status={
              isOnline && otherUser.statusVisible !== false ? "online" : "offline"
            }
          />
          {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
        </>
      }
      subtitle={
        <p
          className={cn(
            "text-sm truncate",
            unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {lastMessage}
        </p>
      }
    />
  );
};

// memo: danh sách re-render khi 1 hội thoại đổi, các card khác (convo ref không đổi) bỏ qua
export default memo(DirectMessageCard);
