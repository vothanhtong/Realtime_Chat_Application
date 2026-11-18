import api from "@/lib/axios";
import type { User } from "@/types/user";

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export const userService = {
  uploadAvatar: async (formData: FormData): Promise<{ user: User; avatarUrl: string }> => {
    const res = await api.post("/users/uploadAvatar", formData, multipart);
    return res.data;
  },

  updateProfile: async (data: {
    displayName?: string;
    bio?: string;
    phone?: string;
  }): Promise<{ user: User }> => {
    const res = await api.patch("/users/profile", data);
    return res.data;
  },

  updateStatusVisibility: async (visible: boolean): Promise<{ user: User }> => {
    const res = await api.patch("/users/status-visible", { statusVisible: visible });
    return res.data;
  },

  uploadChatImage: async (formData: FormData): Promise<{ url: string }> => {
    const res = await api.post("/users/uploadImage", formData, multipart);
    return res.data;
  },
};
