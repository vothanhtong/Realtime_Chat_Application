import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Shared helpers (trước đây bị copy ở nhiều component/store) ───────────────

const BACKEND_ORIGIN =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5001";

/**
 * Avatar/ảnh lưu local trên backend được trả về dạng đường dẫn tương đối
 * (/uploads/...) → ghép với origin của backend. URL tuyệt đối (Cloudinary,
 * Google, GitHub...) giữ nguyên.
 */
export const resolveAvatarUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("/uploads")) return `${BACKEND_ORIGIN}${url}`;
  if (url.includes("/uploads/avatars/")) {
    const filename = url.split("/uploads/avatars/").pop();
    return `${BACKEND_ORIGIN}/uploads/avatars/${filename}`;
  }
  return url;
};

/** Thêm tham số thời gian để trình duyệt không dùng ảnh cũ trong cache */
export const withCacheBust = (url?: string | null): string | undefined =>
  url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : undefined;

/**
 * Lấy thông báo lỗi hiển thị được cho người dùng:
 * message từ backend (AppError) → message của Error → fallback.
 */
export const getErrorMessage = (error: unknown, fallback = "Đã có lỗi xảy ra. Hãy thử lại!") => {
  if (axios.isAxiosError(error)) {
    const serverMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof serverMessage === "string" && serverMessage) return serverMessage;
    if (!error.response) return "Không thể kết nối tới máy chủ. Kiểm tra mạng và thử lại!";
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const formatOnlineTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 60) {
    return `${diffMins}m`; // 5m, 45m
  } else if (diffHours < 24) {
    return `${diffHours}h`; // 3h, 20h
  } else if (diffDays < 30) {
    return `${diffDays}d`; // 1d, 12d
  } else if (diffMonths < 12) {
    return `${diffMonths}m`; // 1m, 2m, 11m
  } else {
    return `${diffYears}y`; // 1y, 2y
  }
};

export const formatMessageTime = (date: Date) => {
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) {
    return timeStr; // ví dụ: "14:35"
  } else if (isYesterday) {
    return `Hôm qua ${timeStr}`; // ví dụ: "Hôm qua 23:10"
  } else if (date.getFullYear() === now.getFullYear()) {
    return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`; // ví dụ: "22/9 09:15"
  } else {
    return `${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()} ${timeStr}`; // ví dụ: "15/12/2023 18:40"
  }
};
