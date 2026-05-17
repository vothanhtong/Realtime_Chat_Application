import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import { SidebarTrigger } from "../ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "../ui/separator";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import { useSocketStore } from "@/stores/useSocketStore";

const ChatWindowHeader = ({ chat }: { chat?: Conversation }) => {
  const { conversations, activeConversationId, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const { onlineUsers } = useSocketStore();

  let otherUser;

  chat = chat ?? conversations.find((c) => c._id === activeConversationId);

  if (!chat) {
    return (
      <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
      </header>
    );
  }

  const typingList = typingUsers[chat._id]?.filter((u) => u.userId !== user?._id) ?? [];

  if (chat.type === "direct") {
    const otherUsers = chat.participants.filter((p) => p._id !== user?._id);
    otherUser = otherUsers.length > 0 ? otherUsers[0] : null;

    if (!user || !otherUser) return null;
  }

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
                    otherUser?._id && onlineUsers.includes(otherUser._id) && otherUser?.statusVisible !== false 
                      ? "online" 
                      : "offline"
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
