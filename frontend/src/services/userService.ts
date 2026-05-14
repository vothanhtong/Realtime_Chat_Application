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
};
