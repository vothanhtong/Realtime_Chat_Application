import api from "@/lib/axios";

export const userService = {
  uploadAvatar: async (formData: FormData) => {
    const res = await api.post("/users/uploadAvatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  updateProfile: async (data: {
    displayName?: string;
    bio?: string;
    phone?: string;
  }) => {
    const res = await api.patch("/users/profile", data);
    return res.data;
  },

  updateStatusVisibility: async (visible: boolean) => {
    const res = await api.patch("/users/status-visible", { statusVisible: visible });
    return res.data;
  },

  uploadChatImage: async (formData: FormData) => {
    const res = await api.post("/users/uploadImage", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
