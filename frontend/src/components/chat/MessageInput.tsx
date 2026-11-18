import type { Conversation } from "@/types/chat";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "../ui/button";
import { ImagePlus, Send, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import { userService } from "@/services/userService";
import { useSendMessage } from "@/hooks/useChatMutations";
import { emitStopTyping, emitTyping } from "@/realtime/socketClient";
import { getErrorMessage } from "@/lib/utils";
import { ACCEPT_IMAGE_ATTR, MAX_CHAT_IMAGE_SIZE_BYTES, validateImageFile } from "@/config/upload";

// Gửi "typing" tối đa 1 lần / 2s khi đang gõ (thay vì mỗi phím);
// tự gửi "stop-typing" sau 3s không gõ. Bên nhận tự hết hạn sau 6s.
const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 3000;

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { mutateAsync: send } = useSendMessage();
  const [value, setValue] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingEmitRef = useRef(0);
  const conversationId = selectedConvo._id;

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) emitStopTyping(conversationId);
    isTypingRef.current = false;
    lastTypingEmitRef.current = 0;
  }, [conversationId]);

  // Đổi phòng / unmount → báo dừng typing cho phòng CŨ
  // (cleanup chạy với stopTyping của lần render trước, giữ conversationId cũ)
  useEffect(() => stopTyping, [stopTyping]);

  const notifyTyping = () => {
    const now = Date.now();
    if (!isTypingRef.current || now - lastTypingEmitRef.current >= TYPING_THROTTLE_MS) {
      emitTyping(conversationId);
      lastTypingEmitRef.current = now;
      isTypingRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    if (next.trim()) {
      notifyTyping();
    } else {
      stopTyping(); // xoá hết nội dung = không còn soạn tin
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cùng giới hạn với backend (config/upload.ts ↔ Backend constants.js)
    const invalid = validateImageFile(file, MAX_CHAT_IMAGE_SIZE_BYTES);
    if (invalid) {
      toast.error(invalid);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setImageUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await userService.uploadChatImage(formData);
      if (res.url) {
        await send({ conversation: selectedConvo, content: "", imgUrl: res.url });
      }
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Gửi ảnh thất bại!"));
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
    stopTyping();

    try {
      await send({ conversation: selectedConvo, content: currValue });
    } catch (error) {
      console.error(error);
      // Trả lại nội dung để người dùng không mất tin vừa gõ
      setValue((v) => (v ? v : currValue));
      toast.error(getErrorMessage(error, "Lỗi xảy ra khi gửi tin nhắn. Bạn hãy thử lại!"));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    // Bộ gõ IME (Telex/VNI trên macOS, CJK...): Enter lúc đang ghép chữ chỉ để
    // xác nhận ký tự — gửi lúc này sẽ mất/cắt dấu. keyCode 229 = Safari báo
    // composition nhưng isComposing có thể đã false.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex items-center gap-2 p-3 xl:p-4 min-h-[56px] xl:min-h-[68px] bg-background border-t border-border/50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept={ACCEPT_IMAGE_ATTR}
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
          onKeyDown={handleKeyDown}
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
