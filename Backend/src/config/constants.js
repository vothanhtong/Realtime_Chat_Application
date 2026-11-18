// ─── Auth ─────────────────────────────────────────────────────────────────────
export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 ngày

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  maxAge: REFRESH_TOKEN_TTL_MS,
};

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_MESSAGE_LIMIT = 50;
export const MAX_MESSAGE_LIMIT = 100;

// ─── Message ──────────────────────────────────────────────────────────────────
export const MAX_MESSAGE_LENGTH = 5000;
export const RECALLED_MESSAGE_CONTENT = "Tin nhắn đã bị thu hồi";

// ─── Socket rate limits (per socket connection) ──────────────────────────────
export const SOCKET_RATE_LIMITS = {
  sendMessage: { windowMs: 10_000, max: 20 }, // 20 tin / 10s
  typing: { windowMs: 10_000, max: 40 },      // vượt ngưỡng thì bỏ qua im lặng
};

// ─── Upload ───────────────────────────────────────────────────────────────────
// ĐỒNG BỘ với frontend/src/config/upload.ts — đổi một bên phải đổi cả hai.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Định dạng thật (đọc từ magic bytes bằng sharp.metadata()), không tin file.mimetype
export const ALLOWED_IMAGE_FORMATS = ["jpeg", "png", "webp", "gif"];
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_CHAT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
// Chặn "decompression bomb": file nhỏ nhưng giải nén ra ảnh khổng lồ
export const MAX_IMAGE_PIXELS = 40_000_000; // ~ 8000 x 5000

export const AVATAR_SIZE = 200; // avatar: crop vuông 200x200
export const AVATAR_QUALITY = 85;
export const CHAT_IMAGE_MAX_WIDTH = 1280; // ảnh chat: giữ tỉ lệ, rộng tối đa 1280px
export const CHAT_IMAGE_QUALITY = 82;

// Body JSON/urlencoded — API chat chỉ nhận text; ảnh đi qua multipart (multer)
export const JSON_BODY_LIMIT = "1mb";
