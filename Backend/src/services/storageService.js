import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * Image storage — Cloudinary when configured, otherwise local disk.
 * Stores ALREADY-PROCESSED WebP buffers (see mediaService); does no image work.
 *
 * Storage ids (saved in User.avatarId):
 *   Cloudinary   "chat_app/avatars/user_<id>_<ts>"      (Cloudinary public_id)
 *   Local disk   "local:avatars/user_<id>_<ts>.webp"     (path under UPLOADS_ROOT)
 *   Legacy local "user_<id>.webp"                         (old format, avatars/ dir)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of locally stored files — served statically at /uploads (server.js) */
export const UPLOADS_ROOT = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, "../../uploads")
);

const LOCAL_PREFIX = "local:";
const FOLDER_RE = /^[a-z0-9_-]+$/;
const NAME_RE = /^[A-Za-z0-9_-]+$/;

export const hasCloudinary = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const uploadToCloudinary = (buffer, { folder, name }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `chat_app/${folder}`,
        public_id: name, // đã gắn timestamp → mỗi lần upload là một asset mới
        overwrite: false,
        resource_type: "image",
      },
      (error, result) =>
        error ? reject(error) : resolve({ url: result.secure_url, storageId: result.public_id })
    );
    stream.end(buffer);
  });

const saveToLocal = async (buffer, { folder, name }) => {
  const dir = path.join(UPLOADS_ROOT, folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const filename = `${name}.webp`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);
  // Đường dẫn tương đối — frontend ghép với origin backend (resolveAvatarUrl)
  return {
    url: `/uploads/${folder}/${filename}`,
    storageId: `${LOCAL_PREFIX}${folder}/${filename}`,
  };
};

/**
 * Store a processed image.
 * @param {Buffer} buffer WebP produced by mediaService
 * @param {{ folder: "avatars" | "chat", name: string }} target name WITHOUT extension
 * @returns {Promise<{ url: string, storageId: string }>}
 */
export const storeImage = async (buffer, { folder, name }) => {
  if (!FOLDER_RE.test(folder) || !NAME_RE.test(name)) {
    throw new Error(`Invalid storage target ${folder}/${name}`);
  }
  return hasCloudinary()
    ? uploadToCloudinary(buffer, { folder, name })
    : saveToLocal(buffer, { folder, name });
};

/** Resolve a local storage id to an absolute path inside UPLOADS_ROOT (or null) */
const localPathFor = (storageId) => {
  const relative = storageId.startsWith(LOCAL_PREFIX)
    ? storageId.slice(LOCAL_PREFIX.length)
    : path.join("avatars", path.basename(storageId)); // legacy "user_x.webp"
  const absolute = path.resolve(UPLOADS_ROOT, relative);
  // Chặn path traversal ("local:../../etc/passwd")
  return absolute.startsWith(UPLOADS_ROOT + path.sep) ? absolute : null;
};

/**
 * Delete a stored image. Missing files are ignored; other failures propagate
 * so the caller decides whether they matter.
 */
export const deleteImage = async (storageId) => {
  if (!storageId) return;

  const isLocal = storageId.startsWith(LOCAL_PREFIX) || storageId.includes(".");
  if (!isLocal) {
    if (hasCloudinary()) await cloudinary.uploader.destroy(storageId);
    return;
  }

  const filePath = localPathFor(storageId);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
};
