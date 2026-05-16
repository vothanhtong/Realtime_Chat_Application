import api from "@/lib/axios";

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await api.post("/auth/signup", {
      username, password, email, firstName, lastName,
    });
    return res.data;
  },

  signIn: async (username: string, password: string) => {
    const res = await api.post("/auth/signin", { username, password });
    return res.data;
  },

  signOut: async () => {
    return api.post("/auth/signout");
  },

  // Note: fetchMe calls /users/me — kept here to avoid breaking useAuthStore
  fetchMe: async () => {
    const res = await api.get("/users/me");
    return res.data.user;
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh");
    return res.data.accessToken;
  },
};
