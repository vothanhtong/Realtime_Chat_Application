import { useAuthStore } from "@/stores/useAuthStore";
import axios, { type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  // Render free tier ngủ sau ~15 phút idle; request đầu tiên phải chờ cold
  // boot 30-50s — timeout 10s luôn chết trong lúc này.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** true khi server trả lời 401 (khác với mất mạng / timeout: không có response) */
export const isUnauthorizedError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 401;

// gắn access token vào req header
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// ─── Refresh token (single-flight) ────────────────────────────────────────────
// Dùng chung cho axios interceptor và Socket.IO (connect_error) — nhiều nơi
// cùng gặp token hết hạn vẫn chỉ gọi /auth/refresh MỘT lần.

let refreshPromise: Promise<string> | null = null;

/**
 * Lấy access token mới từ refresh-token cookie và lưu vào store.
 * - Refresh bị từ chối (401: session hết hạn/không hợp lệ) → đăng xuất.
 * - Lỗi mạng / timeout → KHÔNG đăng xuất, chỉ reject để caller thử lại sau.
 */
export const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{ accessToken: string }>("/auth/refresh")
      .then((res) => {
        const token = res.data.accessToken;
        useAuthStore.getState().setAccessToken(token);
        return token;
      })
      .catch((error: unknown) => {
        if (isUnauthorizedError(error)) {
          useAuthStore.getState().clear(); // App.tsx dọn socket + cache khi phiên kết thúc
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Những API public không bao giờ tự động refresh
const PUBLIC_ENDPOINTS = [
  "/auth/signin",
  "/auth/signup",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  // OAuth: 401 ở đây là lỗi token/verification — refresh vô nghĩa vì
  // chưa có session, và reject bằng lỗi refresh sẽ che mất thông báo thật
  "/auth/oauth/google",
  "/auth/oauth/github",
];

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

// tự động gọi refresh api khi access token hết hạn
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as RetriableRequest | undefined;
    if (!originalRequest) return Promise.reject(error);

    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((url) =>
      originalRequest.url?.includes(url)
    );
    if (isPublicEndpoint) return Promise.reject(error);

    // Chỉ 401 = access token hết hạn/không hợp lệ → refresh.
    // 403 là lỗi phân quyền thật (vd: chưa kết bạn) — refresh không giúp gì.
    if (!isUnauthorizedError(error) || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const token = await refreshAccessToken(); // reject → lỗi refresh được trả về caller
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  }
);

export default api;
