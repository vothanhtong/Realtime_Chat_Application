import { userService } from "@/services/userService";
import type { UserState } from "@/types/store";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { toast } from "sonner";
import { useChatStore } from "./useChatStore";

export const useUserStore = create<UserState>(() => ({
  updateAvatarUrl: async (formData) => {
    try {
      const { setUser } = useAuthStore.getState();
      const data = await userService.uploadAvatar(formData);

      if (data.user) {
        setUser(data.user);
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
}));
