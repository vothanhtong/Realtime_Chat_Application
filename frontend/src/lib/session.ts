import { toast } from "sonner";
import { authService } from "@/services/authService";
import { oauthService } from "@/services/oauthService";
import { useAuthStore } from "@/stores/useAuthStore";
import { isUnauthorizedError, refreshAccessToken } from "./axios";
import { getErrorMessage } from "./utils";
import type { User } from "@/types/user";

/**
 * Auth flows (moved out of useAuthStore so the store holds state only).
 * Ending a session = useAuthStore.clear(); App.tsx then disconnects the socket,
 * clears the query cache and resets UI stores — one place, any trigger
 * (logout button, refresh-token rejection, 401 on /users/me).
 */

const auth = () => useAuthStore.getState();

/**
 * localStorage keys that belong to a login session. Everything else — notably
 * "theme-storage" (user preference) — is deliberately kept on logout.
 * (The old clearState() called localStorage.clear(), wiping the theme too.)
 */
export const SESSION_STORAGE_KEYS = ["auth-storage", "chat-storage" /* legacy */] as const;

/** Remove only session data from browser storage */
export const clearPersistedSession = () => {
  try {
    useAuthStore.persist.clearStorage();
    SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage bị chặn (private mode) — không có gì để xoá
  }
};

/** Load /users/me. Logs out only on a real 401 — network errors keep the session. */
export const fetchMe = async (): Promise<boolean> => {
  try {
    auth().setUser(await authService.fetchMe());
    return true;
  } catch (error) {
    console.error(error);
    if (isUnauthorizedError(error)) {
      auth().clear();
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
    } else {
      toast.error("Không thể tải dữ liệu người dùng. Kiểm tra kết nối và thử lại!");
    }
    return false;
  }
};

/** App start: no access token in memory → try the refresh cookie silently */
export const restoreSession = async (): Promise<boolean> => {
  try {
    await refreshAccessToken(); // 401 → refreshAccessToken clears the session itself
    return true;
  } catch {
    return false;
  }
};

export const signIn = async (username: string, password: string) => {
  try {
    auth().clear();
    const { accessToken } = await authService.signIn(username, password);
    auth().setAccessToken(accessToken);
    await fetchMe();
    toast.success("Chào mừng bạn quay lại với Chat App 🎉");
  } catch (error) {
    console.error(error);
    toast.error(getErrorMessage(error, "Đăng nhập không thành công!"));
    throw error; // form không navigate khi thất bại
  }
};

export const signUp = async (
  username: string,
  password: string,
  email: string,
  firstName: string,
  lastName: string
) => {
  try {
    await authService.signUp(username, password, email, firstName, lastName);
    toast.success("Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập.");
  } catch (error) {
    console.error(error);
    toast.error(getErrorMessage(error, "Đăng ký không thành công"));
    throw error;
  }
};

export const signOut = async () => {
  try {
    await authService.signOut();
    toast.success("Logout thành công!");
  } catch (error) {
    // Vẫn đăng xuất phía client kể cả khi server không trả lời
    console.error(error);
  } finally {
    auth().clear();
    void oauthService.signOutFirebase();
  }
};

/** Google / GitHub via Firebase popup */
export const oauthSignIn = async (provider: "google" | "github"): Promise<User> => {
  const { accessToken, user } =
    provider === "google"
      ? await oauthService.signInWithGoogle()
      : await oauthService.signInWithGitHub();
  auth().setAccessToken(accessToken);
  auth().setUser(user as User);
  return user as User;
};
