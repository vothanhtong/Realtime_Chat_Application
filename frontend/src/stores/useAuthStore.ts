import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState } from "@/types/store";

/**
 * Session state only — no API calls, no imports of other stores.
 * Auth flows (sign in/out, fetchMe, restore) live in src/lib/session.ts.
 * accessToken stays in memory; only `user` is persisted.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      patchUser: (patch) =>
        set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }), // chỉ persist user
    }
  )
);
