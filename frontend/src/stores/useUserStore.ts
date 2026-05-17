import { userService } from "@/services/userService";
import type { UserState } from "@/types/store";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { toast } from "sonner";
import { useChatStore } from "./useChatStore";
import { useSocketStore } from "./useSocketStore";

export const useUserStore = create<UserState>(() => ({
  updateAvatarUrl: async (formData) => {
    try {
      const { setUser } = useAuthStore.getState();
      const { socket } = useSocketStore.getState();
      const data = await userService.uploadAvatar(formData);

      if (data.user) {
        // Append a timestamp to bypass browser cache for the new avatar
        const cacheBustedUser = {
          ...data.user,
          avatarUrl: data.user.avatarUrl
            ? `${data.user.avatarUrl}${data.user.avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
            : data.user.avatarUrl,
        };
        setUser(cacheBustedUser);
        
        // Broadcast avatar update to other users via socket
        if (socket?.connected) {
          socket.emit("profile-updated", {
            userId: data.user._id,
            avatarUrl: cacheBustedUser.avatarUrl,
          });
        }
      }
      useChatStore.getState().fetchConversations();
      toast.success("Cập nhật ảnh đại diện thành công!");
    } catch (error: unknown) {
      console.error("Lỗi khi updateAvatarUrl", error);
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Upload avatar không thành công!";
      toast.error(msg);
    }
  },

  updateProfile: async (data) => {
    try {
      const { user, setUser } = useAuthStore.getState();
      const result = await userService.updateProfile(data);

      if (user && result.user) {
        setUser(result.user);
        toast.success("Cập nhật thông tin thành công!");
      }
    } catch (error: unknown) {
      console.error("Lỗi khi updateProfile", error);
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Cập nhật thất bại. Hãy thử lại!";
      toast.error(msg);
      throw error;
    }
  },

  updateStatusVisibility: async (visible) => {
    try {
      const { setUser } = useAuthStore.getState();
      const { socket } = useSocketStore.getState();

      const result = await userService.updateStatusVisibility(visible);
      if (result.user) {
        setUser(result.user);
        // Notify socket
        if (socket?.connected) {
          socket.emit("toggle-status-visibility", visible);
        }
        toast.success(`Đã chuyển sang chế độ ${visible ? "Trực tuyến" : "Ẩn danh"}`);
      }
    } catch (error) {
      console.error("Lỗi khi updateStatusVisibility", error);
      toast.error("Cập nhật trạng thái hiển thị thất bại!");
    }
  },
}));
