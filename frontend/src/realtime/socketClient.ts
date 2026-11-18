import { io, type Socket } from "socket.io-client";
import { isUnauthorizedError, refreshAccessToken } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSocketStore } from "@/stores/useSocketStore";
import type { Message } from "@/types/chat";
import { registerSocketHandlers, resyncAfterReconnect } from "./handlers";

/**
 * Socket.IO connection owner. The instance lives here (module scope), NOT in a
 * store: stores only expose serializable status (useSocketStore.status).
 * Components talk to the socket through the small emit helpers below.
 */

const baseURL = import.meta.env.VITE_SOCKET_URL;

// Refresh THÀNH CÔNG mà server vẫn từ chối (vd: user đã bị xoá) → dừng,
// tránh vòng lặp refresh → connect → reject vô hạn.
const MAX_AUTH_REJECTIONS_AFTER_REFRESH = 3;
const NETWORK_RETRY_DELAY_MS = 5000;
const ACK_TIMEOUT_MS = 10_000;

let socket: Socket | null = null;

export const connectSocket = () => {
  // Một socket cho cả phiên. Token đọc động qua auth callback ở MỖI lần
  // (re)connect → refresh token không cần tạo socket mới.
  if (socket) return;

  const s: Socket = io(baseURL, {
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    transports: ["websocket", "polling"],
    reconnection: true, // không giới hạn số lần (mặc định Infinity)
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000, // Render cold start ~30-50s
    timeout: 20000,
  });
  socket = s;

  const status = useSocketStore.getState().setStatus;
  const isCurrent = () => socket === s;
  let authRejections = 0;
  let hasConnectedBefore = false;

  status("connecting");
  registerSocketHandlers(s);

  s.on("connect", () => {
    authRejections = 0;
    status("connected");
    // Reconnect mà server không khôi phục được state (>2 phút / restart) → có thể
    // đã lỡ tin trong lúc mất kết nối → đồng bộ lại từ REST.
    if (hasConnectedBefore && !s.recovered) resyncAfterReconnect();
    hasConnectedBefore = true;
  });

  s.on("disconnect", (reason) => {
    status(s.active ? "connecting" : "disconnected");
    // Không còn nhận "user-stop-typing" khi mất kết nối → dọn indicator
    useChatStore.getState().clearTyping();
    if (reason === "io server disconnect") s.connect();
  });

  s.on("connect_error", async (error) => {
    // socket.active = true → lỗi tạm thời: client tự retry với backoff
    if (s.active) return;
    status("disconnected");

    // socket.active = false → middleware từ chối; client KHÔNG tự retry
    if (!error.message.startsWith("Unauthorized")) {
      console.error("Socket connection rejected:", error.message);
      return;
    }
    if (authRejections >= MAX_AUTH_REJECTIONS_AFTER_REFRESH) {
      console.error("Socket auth vẫn bị từ chối sau khi refresh — dừng kết nối lại");
      return;
    }

    try {
      await refreshAccessToken(); // cập nhật store → auth callback đọc token mới
      authRejections += 1;
      if (isCurrent()) {
        status("connecting");
        s.connect();
      }
    } catch (refreshError) {
      // 401: session hết hạn → refreshAccessToken đã đăng xuất (App sẽ ngắt socket)
      if (isUnauthorizedError(refreshError)) return;
      // Mất mạng / timeout khi refresh → thử lại sau, không đăng xuất
      setTimeout(() => {
        if (isCurrent() && !s.connected) s.connect();
      }, NETWORK_RETRY_DELAY_MS);
    }
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    // Luôn disconnect(): socket đang reconnect cũng phải dừng vòng retry
    socket.disconnect();
    socket = null;
  }
  useSocketStore.getState().reset();
  useChatStore.getState().clearTyping();
};

/** "Kết nối lại ngay" (banner): bỏ qua thời gian chờ backoff */
export const reconnectNow = () => {
  if (!socket) {
    connectSocket();
    return;
  }
  if (!socket.connected) {
    useSocketStore.getState().setStatus("connecting");
    socket.connect();
  }
};

// ─── Emit helpers (components never touch the socket instance) ───────────────

export const emitTyping = (conversationId: string) => socket?.emit("typing", conversationId);
export const emitStopTyping = (conversationId: string) =>
  socket?.emit("stop-typing", conversationId);

export interface SendMessagePayload {
  type: "direct" | "group";
  conversationId?: string;
  recipientId?: string;
  content: string;
  imgUrl?: string;
}

/**
 * Send over the socket with an ack. Returns null when not connected so the
 * caller can fall back to REST.
 */
export const sendMessageViaSocket = (payload: SendMessagePayload): Promise<Message> | null => {
  const s = socket;
  if (!s?.connected) return null;

  return new Promise<Message>((resolve, reject) => {
    s.timeout(ACK_TIMEOUT_MS).emit(
      "send-message",
      payload,
      (err: Error | null, response?: { success: boolean; message?: Message; error?: string }) => {
        if (err) return reject(new Error("Gửi tin nhắn quá thời gian chờ, hãy thử lại"));
        if (response?.success && response.message) return resolve(response.message);
        reject(new Error(response?.error || "Gửi tin nhắn thất bại"));
      }
    );
  });
};
