import { useFriendStore } from "@/stores/useFriendStore";
import { DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { MessageCircleMore, UserMinus, Users } from "lucide-react";
import { Card } from "../ui/card";
import UserAvatar from "../chat/UserAvatar";
import { useChatStore } from "@/stores/useChatStore";
import { Button } from "../ui/button";
import { toast } from "sonner";
import StatusBadge from "../chat/StatusBadge";
import { useSocketStore } from "@/stores/useSocketStore";

const FriendListModal = () => {
  const { friends, unfriend } = useFriendStore();
  const { createConversation } = useChatStore();
  const { onlineUsers } = useSocketStore();

  const handleAddConversation = async (friendId: string) => {
    await createConversation("direct", "", [friendId]);
  };

  const handleUnfriend = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) {
      try {
        await unfriend(friendId);
        toast.success("Đã hủy kết bạn!");
      } catch {
        toast.error("Hủy kết bạn thất bại!");
      }
    }
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

          {friends.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-50" />
              Chưa có bạn bè. Thêm bạn vô để tám!
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default FriendListModal;
