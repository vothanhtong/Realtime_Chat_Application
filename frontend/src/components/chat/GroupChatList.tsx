import { Users } from "lucide-react";
import { useGroupConversations } from "@/hooks/useConversations";
import GroupChatCard from "./GroupChatCard";
import ConversationListState from "./ConversationListState";

const GroupChatList = () => {
  // select → chỉ re-render khi danh sách nhóm đổi
  const { data: groupChats = [], isPending, isError, isRefetching, refetch } =
    useGroupConversations();

  return (
    <ConversationListState
      isPending={isPending}
      isError={isError}
      isRefetching={isRefetching}
      isEmpty={groupChats.length === 0}
      onRetry={() => void refetch()}
      emptyTitle="Chưa có nhóm chat nào"
      emptyDescription="Tạo nhóm với ít nhất 2 người bạn bằng nút bên cạnh."
      emptyIcon={<Users className="size-7" />}
    >
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {groupChats.map((convo) => (
          <GroupChatCard
            convo={convo}
            key={convo._id}
          />
        ))}
      </div>
    </ConversationListState>
  );
};

export default GroupChatList;
