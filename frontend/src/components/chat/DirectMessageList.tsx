import { MessageCircle } from "lucide-react";
import { useDirectConversations } from "@/hooks/useConversations";
import DirectMessageCard from "./DirectMessageCard";
import ConversationListState from "./ConversationListState";

const DirectMessageList = () => {
  // select → chỉ re-render khi danh sách chat 1-1 đổi
  const { data: directConversations = [], isPending, isError, isRefetching, refetch } =
    useDirectConversations();

  return (
    <ConversationListState
      isPending={isPending}
      isError={isError}
      isRefetching={isRefetching}
      isEmpty={directConversations.length === 0}
      onRetry={() => void refetch()}
      emptyTitle="Chưa có cuộc trò chuyện nào"
      emptyDescription='Bấm "Gửi tin nhắn mới" để bắt đầu trò chuyện với bạn bè.'
      emptyIcon={<MessageCircle className="size-7" />}
    >
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {directConversations.map((convo) => (
          <DirectMessageCard
            convo={convo}
            key={convo._id}
          />
        ))}
      </div>
    </ConversationListState>
  );
};

export default DirectMessageList;
