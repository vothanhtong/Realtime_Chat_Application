import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService } from "@/services/userService";
import { getErrorMessage, withCacheBust } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Profile mutations (replaces useUserStore). The backend emits "user-updated"
 * to friends + our own other tabs; this tab updates the auth store directly.
 */

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; phone?: string }) =>
      userService.updateProfile(data),
    onSuccess: ({ user }) => {
      useAuthStore.getState().setUser(user);
      toast.success("Cập nhật thông tin thành công!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Cập nhật thất bại. Hãy thử lại!")),
  });

export const useUploadAvatar = () =>
  useMutation({
    mutationFn: (formData: FormData) =>
      userService.uploadAvatar(formData),
    onSuccess: ({ user }) => {
      // Cùng public_id → URL có thể không đổi; thêm tham số để bỏ qua cache trình duyệt
      useAuthStore.getState().setUser({ ...user, avatarUrl: withCacheBust(user.avatarUrl) });
      toast.success("Cập nhật ảnh đại diện thành công!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Upload avatar không thành công!")),
  });

export const useUpdateStatusVisibility = () =>
  useMutation({
    mutationFn: (visible: boolean) =>
      userService.updateStatusVisibility(visible),
    onSuccess: ({ user }, visible) => {
      useAuthStore.getState().setUser(user);
      toast.success(`Đã chuyển sang chế độ ${visible ? "Trực tuyến" : "Ẩn danh"}`);
    },
    onError: () => toast.error("Cập nhật trạng thái hiển thị thất bại!"),
  });
