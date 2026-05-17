import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { ImagePlus, Send, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { useChatStore } from "@/stores/useChatStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { toast } from "sonner";
import { userService } from "@/services/userService";

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const { sendDirectMessage, sendGroupMessage } = useChatStore();
  const [value, setValue] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!user) return;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);

    if (socket && selectedConvo._id) {
      socket.emit("typing", selectedConvo._id);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", selectedConvo._id);
      }, 2000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await userService.uploadChatImage(formData);
      if (res.url) {
        if (selectedConvo.type === "direct") {
          const participants = selectedConvo.participants;
          const otherUser = participants.filter((p) => p._id !== user._id)[0];
          await sendDirectMessage(otherUser._id, "", res.url);
        } else {
          await sendGroupMessage(selectedConvo._id, "", res.url);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Gửi ảnh thất bại!");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (!value.trim()) return;
    const currValue = value;
    setValue("");

    // Stop typing immediately
    if (socket && selectedConvo._id) {
      socket.emit("stop-typing", selectedConvo._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    try {
      if (selectedConvo.type === "direct") {
        const participants = selectedConvo.participants;
        const otherUser = participants.filter((p) => p._id !== user._id)[0];
        await sendDirectMessage(otherUser._id, currValue);
      } else {
        await sendGroupMessage(selectedConvo._id, currValue);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Bạn hãy thử lại!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 xl:p-4 min-h-[56px] xl:min-h-[68px] bg-background border-t border-border/50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-primary/10 transition-smooth shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={imageUploading}
      >
        {imageUploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <ImagePlus className="size-5" />
        )}
      </Button>

      <div className="flex-1 relative">
        <Input
          onKeyPress={handleKeyPress}
          value={value}
          onChange={handleInputChange}
          placeholder="Soạn tin nhắn..."
          className="pr-20 h-10 xl:h-12 xl:text-base bg-white border-border/50 focus:border-primary/50 transition-smooth resize-none"
        ></Input>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-primary/10 transition-smooth"
          >
            <div>
              <EmojiPicker
                onChange={(emoji: string) => setValue(`${value}${emoji}`)}
              />
            </div>
          </Button>
        </div>
      </div>

      <Button
        onClick={sendMessage}
        size="default"
        className="bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105 xl:px-5 xl:h-12 shrink-0"
        disabled={!value.trim() || imageUploading}
      >
        <Send className="size-5 text-white" />
      </Button>
    </div>
  );
};

export default MessageInput;
