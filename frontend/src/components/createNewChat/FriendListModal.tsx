import { useFriends, useUnfriend } from "@/hooks/useFriends";
import { useCreateConversation } from "@/hooks/useChatMutations";
import { DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { MessageCircleMore, UserMinus, Users } from "lucide-react";
import { Card } from "../ui/card";
import UserAvatar from "../chat/UserAvatar";
import { Button } from "../ui/button";
import { EmptyState, ErrorState, LoadingState } from "../common/QueryStates";
import StatusBadge from "../chat/StatusBadge";
import { useSocketStore } from "@/stores/useSocketStore";

interface FriendListModalProps {
  onClose?: () => void;
}

const FriendListModal = ({ onClose }: FriendListModalProps) => {
  const {
    data: friends = [],
    isPending: friendsLoading,
    isError: friendsError,
    isRefetching,
    refetch,
  } = useFriends();
  const { mutate: unfriend } = useUnfriend();
  const { mutate: createConversation, isPending: creating } = useCreateConversation();
  const onlineUsers = useSocketStore((s) => s.onlineUsers);

  const handleAddConversation = (friendId: string) => {
    if (creating) return; // chặn bấm liên tục
    createConversation(
      { type: "direct", name: "", memberIds: [friendId] },
      { onSuccess: () => onClose?.() }
    );
  };

  const handleUnfriend = (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) unfriend(friendId);
  };

  return (
    <DialogContent className="glass max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl capitalize">
          <MessageCircleMore className="size-5" />
          bắt đầu hội thoại mới
        </DialogTitle>
      </DialogHeader>

      {/* friends list */}
      <div className="space-y-4">
        <h1 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          danh sách bạn bè
        </h1>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {friends.map((friend) => (
            <Card
              onClick={() => handleAddConversation(friend._id)}
              key={friend._id}
              className="p-3 cursor-pointer transition-smooth hover:shadow-soft glass hover:bg-muted/30 group/friendCard"
            >
              <div className="flex items-center gap-3">
                {/* avatar */}
                <div className="relative">
                  <UserAvatar
                    type="sidebar"
                    name={friend.displayName}
                    avatarUrl={friend.avatarUrl}
                    statusVisible={friend.statusVisible}
                  />
                  <StatusBadge
                    status={
                      onlineUsers.includes(friend._id) && friend.statusVisible !== false 
                        ? "online" 
                        : "offline"
                    }
                  />
                </div>

                {/* info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h2 className="font-semibold text-sm truncate">
                    {friend.displayName}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    @{friend.username}
                  </span>
                </div>

                {/* actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover/friendCard:opacity-100 text-destructive hover:bg-destructive/10 transition-all duration-200"
                  onClick={(e) => handleUnfriend(e, friend._id)}
                >
                  <UserMinus className="size-4" />
                </Button>
              </div>
            </Card>
          ))}

          {friendsLoading && <LoadingState label="Đang tải danh sách bạn bè…" />}

          {friendsError && (
            <ErrorState
              message="Không tải được danh sách bạn bè."
              onRetry={() => void refetch()}
              retrying={isRefetching}
            />
          )}

          {!friendsLoading && !friendsError && friends.length === 0 && (
            <EmptyState
              icon={<Users className="size-10" />}
              title="Chưa có bạn bè"
              description="Bấm biểu tượng ＋ cạnh mục Bạn bè để tìm và kết bạn."
            />
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default FriendListModal;
