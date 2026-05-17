import { cn, formatMessageTime } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { MoreHorizontal, Trash2, Undo2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useChatStore } from "@/stores/useChatStore";
import { Button } from "../ui/button";
import OptimizedImage from "./OptimizedImage";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
  onImageClick: (url: string) => void;
}

const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
  lastMessageStatus,
  onImageClick,
}: MessageItemProps) => {
  const { deleteMessage, recallMessage } = useChatStore();
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;

  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() -
      new Date(prev?.createdAt || 0).getTime() >
      300000; // 5 phút

  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString()
  );

  return (
    <>
      {/* time */}
      {isShowTime && (
        <span className="flex justify-center text-xs text-muted-foreground px-1">
          {formatMessageTime(new Date(message.createdAt))}
        </span>
      )}

      <div
        className={cn(
          "flex gap-2 group mt-1",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isGroupBreak && (
              <UserAvatar
                type="chat"
                name={participant?.displayName ?? "Moji"}
                avatarUrl={participant?.avatarUrl ?? undefined}
                statusVisible={participant?.statusVisible}
                isOwn={false}
              />
            )}
          </div>
        )}

        {/* tin nhắn */}
        <div
          className={cn(
            "max-w-[75vw] sm:max-w-sm lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          <div className="flex items-center gap-1 group/item">
            {message.isOwn && (
              <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 rounded-full"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!message.isRecalled && (
                      <DropdownMenuItem
                        className="text-orange-500 cursor-pointer"
                        onClick={() => recallMessage(message._id)}
                      >
                        <Undo2 className="mr-2 size-4" />
                        Thu hồi
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onClick={() => deleteMessage(message._id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-1.5",
                message.isOwn ? "items-end" : "items-start"
              )}
            >
              {message.imgUrl && !message.isRecalled && (
                <OptimizedImage
                  src={message.imgUrl}
                  containerClassName="max-w-[240px] sm:max-w-[320px] xl:max-w-[420px] shadow-sm ring-1 ring-border/20"
                  onClick={() => onImageClick(message.imgUrl!)}
                />
              )}

              {(message.content || message.isRecalled) && (
                <Card
                  className={cn(
                    "px-4 py-2.5",
                    message.isOwn
                      ? "chat-bubble-sent border-0"
                      : "chat-bubble-received",
                    message.isRecalled && "bg-muted/50 border border-muted"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm xl:text-base leading-relaxed break-words",
                      message.isRecalled && "italic text-muted-foreground"
                    )}
                  >
                    {message.isRecalled
                      ? "Tin nhắn đã được thu hồi"
                      : message.content}
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* seen/ delivered */}
          {message.isOwn && message._id === selectedConvo.lastMessage?._id && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0.5 h-4 border-0",
                lastMessageStatus === "seen"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {lastMessageStatus === "seen" ? "Đã xem" : "Đã chuyển"}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;
