import multer from "multer";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  MAX_CHAT_IMAGE_SIZE_BYTES,
} from "../config/constants.js";
import { AppError } from "../utils/AppError.js";
import { inspectImage } from "../services/mediaService.js";

/**
 * Upload pipelines:  multer (size limit + cheap mimetype pre-filter)
 *                 →  verifyImageFile (REAL format from magic bytes)
 *                 →  controller → userService → mediaService (resize/encode) → storageService
 */

const toMB = (bytes) => Math.round(bytes / 1024 / 1024);

const createUploader = (maxBytes) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    // Pre-filter on the client-declared type only to reject obvious junk early —
    // the authoritative check is verifyImageFile below.
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
      else cb(new AppError("Chỉ chấp nhận file ảnh JPEG, PNG, WebP hoặc GIF", 400));
    },
  });

/** Reject files whose bytes are not an allowed image, whatever their mimetype says */
const verifyImageFile = async (req, _res, next) => {
  try {
    if (!req.file) throw new AppError("Không có file được upload", 400);
    req.imageMetadata = await inspectImage(req.file.buffer);
    next();
  } catch (error) {
    next(error);
  }
};

/** Attach the size limit to the request so errorHandler can report it (413) */
const withLimit = (maxBytes) => (req, _res, next) => {
  req.uploadLimitMB = toMB(maxBytes);
  next();
};

export const avatarUpload = [
  withLimit(MAX_AVATAR_SIZE_BYTES),
  createUploader(MAX_AVATAR_SIZE_BYTES).single("file"),
  verifyImageFile,
];

export const chatImageUpload = [
  withLimit(MAX_CHAT_IMAGE_SIZE_BYTES),
  createUploader(MAX_CHAT_IMAGE_SIZE_BYTES).single("file"),
  verifyImageFile,
];
