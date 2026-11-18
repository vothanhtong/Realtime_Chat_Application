import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import UnreadCountBadge from "./UnreadCountBadge";
import GroupChatAvatar from "./GroupChatAvatar";

const GroupChatCard = ({ convo }: { convo: Conversation }) => {
  const myId = useAuthStore((s) => s.user?._id);
  // Selector hẹp: chỉ re-render khi CHÍNH card này đổi trạng thái active
  const { isActive, selectConversation } = useChatStore(
    useShallow((s) => ({
      isActive: s.selectedConversationId === convo._id,
      selectConversation: s.selectConversation,
    }))
  );

  if (!myId) return null;

  const unreadCount = convo.unreadCounts?.[myId] ?? 0;
  const name = convo.group?.name ?? "";

  return (
    <ChatCard
      convoId={convo._id}
      name={name}
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
          {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
          <GroupChatAvatar
            participants={convo.participants}
            type="chat"
          />
        </>
      }
      subtitle={
        <p className="text-sm truncate text-muted-foreground">
          {convo.participants.length} thành viên
        </p>
      }
    />
  );
};

export default memo(GroupChatCard);
