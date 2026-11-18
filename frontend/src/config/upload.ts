/**
 * Upload limits — ĐỒNG BỘ với Backend/src/config/constants.js
 * (MAX_AVATAR_SIZE_BYTES, MAX_CHAT_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES).
 * Kiểm tra ở client chỉ để báo lỗi sớm; backend vẫn là nơi quyết định
 * (kiểm tra magic bytes + giới hạn multer → 413).
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const ACCEPT_IMAGE_ATTR = ALLOWED_IMAGE_TYPES.join(",");

const MB = 1024 * 1024;
export const MAX_AVATAR_SIZE_BYTES = 2 * MB;
export const MAX_CHAT_IMAGE_SIZE_BYTES = 5 * MB;

/** Returns an error message, or null when the file is acceptable */
export const validateImageFile = (file: File, maxBytes: number): string | null => {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)";
  }
  if (file.size > maxBytes) {
    return `Ảnh không được vượt quá ${Math.round(maxBytes / MB)}MB`;
  }
  return null;
};
