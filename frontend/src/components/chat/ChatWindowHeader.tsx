import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import type { TypingUser } from "@/types/store";
import { SidebarTrigger } from "../ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "../ui/separator";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import { useSocketStore } from "@/stores/useSocketStore";

const NO_TYPING: TypingUser[] = [];

const ChatWindowHeader = ({ chat }: { chat: Conversation }) => {
  const myId = useAuthStore((s) => s.user?._id);

  // useShallow: filter() tạo mảng mới mỗi lần, nhưng chỉ re-render khi danh sách
  // người đang gõ của PHÒNG NÀY thực sự đổi (không phải khi phòng khác có người gõ)
  const typingList = useChatStore(
    useShallow((s) => (s.typingUsers[chat._id] ?? NO_TYPING).filter((u) => u.userId !== myId))
  );

  const otherUser =
    chat.type === "direct" ? chat.participants.find((p) => p._id !== myId) ?? null : null;

  // Selector boolean → chỉ re-render khi trạng thái online của người này đổi
  const isOtherOnline = useSocketStore(
    (s) => !!otherUser && s.onlineUsers.includes(otherUser._id)
  );

  if (!myId || (chat.type === "direct" && !otherUser)) return null;

  return (
    <header className="sticky top-0 z-10 px-4 py-3 xl:py-4 flex items-center bg-background border-b border-border/50">
      <div className="flex items-center gap-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-5"
        />

        <div className="p-2 w-full flex items-center gap-3">
          {/* avatar */}
          <div className="relative">
            {chat.type === "direct" ? (
              <>
                <UserAvatar
                  type={"sidebar"}
                  name={otherUser?.displayName || "Moji"}
                  avatarUrl={otherUser?.avatarUrl || undefined}
                  statusVisible={otherUser?.statusVisible}
                  isOwn={false}
                />
                <StatusBadge
                  status={
                    isOtherOnline && otherUser?.statusVisible !== false ? "online" : "offline"
                  }
                />
              </>
            ) : (
              <GroupChatAvatar
                participants={chat.participants}
                type="sidebar"
              />
            )}
          </div>

          {/* name and typing status */}
          <div className="flex flex-col">
            <h2 className="font-semibold text-base xl:text-lg text-foreground leading-none">
              {chat.type === "direct" ? otherUser?.displayName : chat.group?.name}
            </h2>
            {typingList.length > 0 && (
              <span className="text-xs xl:text-sm text-primary animate-pulse font-medium mt-0.5">
                {typingList.length === 1
                  ? `${typingList[0].displayName} đang soạn tin...`
                  : `${typingList.length} người đang soạn tin...`}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ChatWindowHeader;
