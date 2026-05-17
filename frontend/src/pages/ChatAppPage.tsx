import ChatWindowLayout from "@/components/chat/ChatWindowLayout";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const ChatAppPage = () => {
  return (
    <SidebarProvider>
      <AppSidebar />

      <div className="flex h-screen w-full p-0 md:p-2 xl:p-3">
        <ChatWindowLayout />
      </div>
    </SidebarProvider>
  );
};

export default ChatAppPage;
