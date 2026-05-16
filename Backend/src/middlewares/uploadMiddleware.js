import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  AVATAR_SIZE,
  AVATAR_QUALITY,
} from "../config/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads/avatars");

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Cloudinary detection ─────────────────────────────────────────────────────

const hasCloudinary = () =>
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

// ─── Multer ───────────────────────────────────────────────────────────────────

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Chỉ chấp nhận file ảnh: ${ALLOWED_IMAGE_TYPES.join(", ")}`));
    }
  },
});

// ─── Image processing ─────────────────────────────────────────────────────────

const processImage = (buffer) =>
  sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "center" })
    .webp({ quality: AVATAR_QUALITY })
    .toBuffer();

// ─── Storage backends ─────────────────────────────────────────────────────────

const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "chat_app/avatars",
        resource_type: "image",
        format: "webp",
        transformation: [
          {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            crop: "fill",
            gravity: "face",
            quality: "auto:good",
          },
        ],
        ...options,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

const saveToLocal = async (buffer, filename) => {
  const processedBuffer = await processImage(buffer);
  const webpFilename = filename.replace(/\.(jpg|jpeg|png|gif)$/i, ".webp");
  const filePath = path.join(UPLOADS_DIR, webpFilename);

  await fs.promises.writeFile(filePath, processedBuffer);

  // Return a relative path — the frontend resolves the base URL from env
  return {
    secure_url: `/uploads/avatars/${webpFilename}`,
    public_id: webpFilename,
    source: "local",
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload an image buffer to Cloudinary (if configured) or local disk.
 * @param {Buffer} buffer
 * @param {{ public_id?: string, mimetype?: string, overwrite?: boolean }} options
 */
export const uploadImage = async (buffer, options = {}) => {
  if (hasCloudinary()) {
    return uploadToCloudinary(buffer, options);
  }

  const ext = options.mimetype ? options.mimetype.split("/")[1] : "jpg";
  const filename = options.public_id
    ? `${options.public_id}.${ext}`
    : `avatar_${Date.now()}.${ext}`;

  return saveToLocal(buffer, filename);
};

/**
 * Delete an image from Cloudinary or local disk.
 * Silently ignores missing files.
 * @param {string} publicId
 */
export const deleteImage = async (publicId) => {
  if (!publicId) return;

  if (hasCloudinary() && !publicId.includes(".")) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Lỗi khi xóa ảnh Cloudinary:", err);
    }
    return;
  }

  // Local file
  const filePath = path.join(UPLOADS_DIR, publicId);
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Lỗi khi xóa file local:", err);
  }
};
