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

// ─── Upload ───────────────────────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_SIZE = 200;
export const AVATAR_QUALITY = 85;
