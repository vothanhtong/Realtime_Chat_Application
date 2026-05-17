import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import MessageItem from "./MessageItem";
import { useEffect, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import ImagePreview from "./ImagePreview";

const ChatWindowBody = () => {
  const {
    activeConversationId,
    conversations,
    messages: allMessages,
    fetchMessages,
  } = useChatStore();
  const { user } = useAuthStore();
  const [lastMessageStatus, setLastMessageStatus] = useState<"delivered" | "seen">(
    "delivered"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const messages = allMessages[activeConversationId!]?.items ?? [];
  const hasMore = allMessages[activeConversationId!]?.hasMore ?? false;
  const selectedConvo = conversations.find((c) => c._id === activeConversationId);

  // seen status - check if anyone OTHER than the sender has seen the message
  useEffect(() => {
    const lastMessage = selectedConvo?.lastMessage;
    if (!lastMessage || !user) return;

    const seenBy = selectedConvo?.seenBy ?? [];
    
    // Check if anyone other than the current user (sender) has seen the message
    const seenByOthers = seenBy.some((seenUser) => seenUser._id !== user._id);
    
    setLastMessageStatus(seenByOthers ? "seen" : "delivered");
  }, [selectedConvo, user]);

  const fetchMoreMessages = async () => {
    if (!activeConversationId || !hasMore) return;
    try {
      await fetchMessages(activeConversationId);
    } catch (error) {
      console.error("Lỗi xảy ra khi fetch thêm tin", error);
    }
  };

  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }

  if (!messages?.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground ">
        Chưa có tin nhắn nào trong cuộc trò chuyện này.
      </div>
    );
  }

  return (
    <div className="p-3 md:p-5 xl:p-6 bg-primary-foreground h-full overflow-hidden flex flex-col">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        followOutput="smooth"
        startReached={fetchMoreMessages}
        atBottomThreshold={100}
        increaseViewportBy={200}
        className="beautiful-scrollbar overflow-x-hidden"
        itemContent={(index, message) => (
          <MessageItem
            key={message._id ?? index}
            message={message}
            index={index}
            messages={messages}
            selectedConvo={selectedConvo}
            lastMessageStatus={lastMessageStatus}
            onImageClick={setPreviewUrl}
          />
        )}
      />

      <ImagePreview
        src={previewUrl}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  );
};

export default ChatWindowBody;
