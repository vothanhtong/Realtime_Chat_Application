import { memo } from "react";
import { cn, formatMessageTime } from "@/lib/utils";
import type { Message, Participant } from "@/types/chat";
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
import { Button } from "../ui/button";
import OptimizedImage from "./OptimizedImage";

/**
 * Props are deliberately "narrow" and stable so React.memo can skip rows:
 *  - prevMessage instead of the whole messages array (array changes on every new message)
 *  - participant instead of the whole conversation
 *  - status only on the last own message (undefined for every other row)
 *  - callbacks are memoised by the parent and take the message id
 */
interface MessageItemProps {
  message: Message;
  prevMessage?: Message;
  isOwn: boolean;
  participant?: Participant;
  status?: "delivered" | "seen";
  onImageClick: (url: string) => void;
  onRecall: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

const FIVE_MINUTES = 5 * 60 * 1000;

const MessageItem = ({
  message,
  prevMessage: prev,
  isOwn,
  participant,
  status,
  onImageClick,
  onRecall,
  onDelete,
}: MessageItemProps) => {
  // Hiện mốc thời gian ở tin đầu tiên, hoặc khi cách tin liền trước > 5 phút
  const isShowTime =
    !prev ||
    new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() > FIVE_MINUTES;

  // Bắt đầu một cụm tin mới (hiện avatar) khi có mốc thời gian hoặc đổi người gửi
  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

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
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* avatar */}
        {!isOwn && (
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
            isOwn ? "items-end" : "items-start"
          )}
        >
          <div className="flex items-center gap-1 group/item">
            {isOwn && (
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
                        onClick={() => onRecall(message._id)}
                      >
                        <Undo2 className="mr-2 size-4" />
                        Thu hồi
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onClick={() => onDelete(message._id)}
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
                isOwn ? "items-end" : "items-start"
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
                    isOwn
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
          {status && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0.5 h-4 border-0",
                status === "seen"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {status === "seen" ? "Đã xem" : "Đã chuyển"}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(MessageItem);
