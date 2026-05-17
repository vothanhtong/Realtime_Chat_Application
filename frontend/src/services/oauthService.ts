import { signInWithPopup, type UserCredential } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/config/firebase";
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

/**
 * Sign in with Google using Firebase
 */
export const signInWithGoogle = async (): Promise<OAuthResponse> => {
  try {
    // Step 1: Sign in with Firebase
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    
    // Step 2: Get Firebase ID token
    const idToken = await result.user.getIdToken();
    
    // Step 3: Send token to backend
    const response = await api.post<OAuthResponse>("/auth/oauth/google", {
      idToken,
    });
    
    return response.data;
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    
    // Handle specific Firebase errors
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Đăng nhập bị hủy");
    } else if (error.code === "auth/popup-blocked") {
      throw new Error("Popup bị chặn. Vui lòng cho phép popup và thử lại");
    } else if (error.code === "auth/cancelled-popup-request") {
      throw new Error("Yêu cầu đăng nhập bị hủy");
    }
    
    throw error;
  }
};

/**
 * Sign in with GitHub using Firebase
 */
export const signInWithGitHub = async (): Promise<OAuthResponse> => {
  try {
    // Step 1: Sign in with Firebase
    const result: UserCredential = await signInWithPopup(auth, githubProvider);
    
    // Step 2: Get Firebase ID token
    const idToken = await result.user.getIdToken();
    
    // Step 3: Send token to backend
    const response = await api.post<OAuthResponse>("/auth/oauth/github", {
      idToken,
    });
    
    return response.data;
  } catch (error: any) {
    console.error("GitHub sign-in error:", error);
    
    // Handle specific Firebase errors
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Đăng nhập bị hủy");
    } else if (error.code === "auth/popup-blocked") {
      throw new Error("Popup bị chặn. Vui lòng cho phép popup và thử lại");
    } else if (error.code === "auth/cancelled-popup-request") {
      throw new Error("Yêu cầu đăng nhập bị hủy");
    } else if (error.code === "auth/account-exists-with-different-credential") {
      throw new Error("Email này đã được sử dụng với phương thức đăng nhập khác");
    }
    
    throw error;
  }
};

/**
 * Sign out from Firebase
 */
export const signOutFirebase = async (): Promise<void> => {
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
