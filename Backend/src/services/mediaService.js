import sharp from "sharp";
import { AppError } from "../utils/AppError.js";
import {
  ALLOWED_IMAGE_FORMATS,
  MAX_IMAGE_PIXELS,
  AVATAR_SIZE,
  AVATAR_QUALITY,
  CHAT_IMAGE_MAX_WIDTH,
  CHAT_IMAGE_QUALITY,
} from "../config/constants.js";

/**
 * Image pipelines. Every upload is decoded and re-encoded on the server BEFORE
 * it reaches storage (Cloudinary or disk), so:
 *   - the same size rules apply whatever the storage backend is
 *   - the stored file is always a clean WebP — EXIF metadata (GPS location,
 *     camera serial…) is stripped, and anything that is not a real image fails
 *     to decode.
 */

const SHARP_OPTIONS = { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error" };

/**
 * Detect the REAL format from the file bytes (magic bytes) — never trust the
 * client-supplied `file.mimetype`.
 * @returns {Promise<import('sharp').Metadata>}
 * @throws {AppError} 400 when the buffer is not an allowed image
 */
export const inspectImage = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError("Không có file được upload", 400);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, SHARP_OPTIONS).metadata();
  } catch {
    throw new AppError("File không phải ảnh hợp lệ hoặc đã bị hỏng", 400);
  }

  if (!ALLOWED_IMAGE_FORMATS.includes(metadata.format)) {
    throw new AppError(
      `Định dạng ảnh không được hỗ trợ (${metadata.format ?? "không rõ"}). Chỉ chấp nhận JPEG, PNG, WebP, GIF`,
      400
    );
  }
  if (!metadata.width || !metadata.height) {
    throw new AppError("File không phải ảnh hợp lệ hoặc đã bị hỏng", 400);
  }
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new AppError("Kích thước ảnh quá lớn", 400);
  }
  return metadata;
};

const encodeOrFail = async (pipeline) => {
  try {
    return await pipeline.toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError("Không thể xử lý ảnh. File có thể đã bị hỏng", 400);
  }
};

/** Avatar: square 200x200 crop (attention = keep the most salient area, e.g. a face) */
export const processAvatar = async (buffer) => {
  await inspectImage(buffer);
  const { data, info } = await encodeOrFail(
    sharp(buffer, SHARP_OPTIONS)
      .rotate() // honour EXIF orientation before cropping
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: sharp.strategy.attention })
      .webp({ quality: AVATAR_QUALITY })
  );
  return { buffer: data, width: info.width, height: info.height, format: "webp" };
};

/**
 * Chat image: keep the original aspect ratio, cap the width at 1280px, never
 * upscale. Animated GIFs stay animated (re-encoded as animated WebP).
 */
export const processChatImage = async (buffer) => {
  const metadata = await inspectImage(buffer);
  const animated = (metadata.pages ?? 1) > 1;

  let pipeline = sharp(buffer, { ...SHARP_OPTIONS, animated });
  if (!animated) pipeline = pipeline.rotate(); // EXIF auto-orient (single frame only)

  const { data, info } = await encodeOrFail(
    pipeline
      .resize({ width: CHAT_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: CHAT_IMAGE_QUALITY })
  );
  // info.height of an animated image is the height of ALL frames stacked
  const height = animated ? Math.round(info.height / (metadata.pages ?? 1)) : info.height;
  return { buffer: data, width: info.width, height, format: "webp" };
};
