import { SidebarInset, SidebarTrigger } from "../ui/sidebar";

const ChatWelcomeScreen = () => {
  return (
    <SidebarInset className="flex w-full h-full bg-transparent">
      {/* Mobile: nút mở sidebar khi chưa chọn cuộc trò chuyện */}
      <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
      </header>
      <div className="flex bg-primary-foreground rounded-none md:rounded-2xl flex-1 items-center justify-center p-4">
        <div className="text-center px-4">
          <div className="size-16 sm:size-24 mx-auto mb-4 sm:mb-6 bg-gradient-chat rounded-full flex items-center justify-center shadow-glow pulse-ring">
            <span className="text-2xl sm:text-3xl">💬</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold mb-2 bg-gradient-chat bg-clip-text text-transparent">
            Chào mừng bạn đến với Chat App!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Chọn một cuộc hội thoại để bắt đầu chat!
          </p>
        </div>
      </div>
    </SidebarInset>
  );
};

export default ChatWelcomeScreen;
