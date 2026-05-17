import { signInWithPopup, type UserCredential } from "firebase/auth";
import { auth, googleProvider, githubProvider, isFirebaseReady } from "@/config/firebase";
import api from "@/lib/axios";

export interface OAuthResponse {
  accessToken: string;
  user: {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    statusVisible?: boolean;
  };
}

export const signInWithGoogle = async (): Promise<OAuthResponse> => {
  if (!isFirebaseReady || !auth || !googleProvider) {
    throw new Error("Firebase chưa được cấu hình. Vui lòng điền VITE_FIREBASE_* vào file .env");
  }

  try {
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const response = await api.post<OAuthResponse>("/auth/oauth/google", { idToken });
    return response.data;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "auth/popup-closed-by-user") throw new Error("Đăng nhập bị hủy");
    if (firebaseError.code === "auth/popup-blocked") throw new Error("Popup bị chặn. Vui lòng cho phép popup và thử lại");
    if (firebaseError.code === "auth/cancelled-popup-request") throw new Error("Yêu cầu đăng nhập bị hủy");
    throw error;
  }
};

export const signInWithGitHub = async (): Promise<OAuthResponse> => {
  if (!isFirebaseReady || !auth || !githubProvider) {
    throw new Error("Firebase chưa được cấu hình. Vui lòng điền VITE_FIREBASE_* vào file .env");
  }

  try {
    const result: UserCredential = await signInWithPopup(auth, githubProvider);
    const idToken = await result.user.getIdToken();
    const response = await api.post<OAuthResponse>("/auth/oauth/github", { idToken });
    return response.data;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "auth/popup-closed-by-user") throw new Error("Đăng nhập bị hủy");
    if (firebaseError.code === "auth/popup-blocked") throw new Error("Popup bị chặn. Vui lòng cho phép popup và thử lại");
    if (firebaseError.code === "auth/cancelled-popup-request") throw new Error("Yêu cầu đăng nhập bị hủy");
    if (firebaseError.code === "auth/account-exists-with-different-credential") throw new Error("Email này đã được sử dụng với phương thức đăng nhập khác");
    throw error;
  }
};

export const signOutFirebase = async (): Promise<void> => {
  if (!auth) return;
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Firebase sign-out error:", error);
  }
};

export const oauthService = {
  signInWithGoogle,
  signInWithGitHub,
  signOutFirebase,
};
