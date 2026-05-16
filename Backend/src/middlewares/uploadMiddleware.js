import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads/avatars");

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Kiểm tra Cloudinary đã config chưa
const hasCloudinary = () =>
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

// Multer — lưu vào memory để xử lý linh hoạt
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)"));
    }
  },
});

// Resize và optimize ảnh với sharp
const processImage = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize(200, 200, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 85 }) // Convert to WebP for better compression
      .toBuffer();
  } catch (error) {
    console.error("Lỗi khi xử lý ảnh:", error);
    throw error;
  }
};

// Upload lên Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "chat_app/avatars",
        resource_type: "image",
        format: "webp", // Force WebP format
        transformation: [
          { 
            width: 200, 
            height: 200, 
            crop: "fill", 
            gravity: "face",
            quality: "auto:good",
          }
        ],
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// Lưu local với sharp optimization
const saveToLocal = async (buffer, filename) => {
  try {
    const processedBuffer = await processImage(buffer);
    const webpFilename = filename.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    const filePath = path.join(UPLOADS_DIR, webpFilename);
    await fs.promises.writeFile(filePath, processedBuffer);

    // Trả về relative path — frontend tự ghép base URL, tránh hardcode localhost
    return {
      secure_url: `/uploads/avatars/${webpFilename}`,
      public_id: webpFilename,
      source: "local",
    };
  } catch (error) {
    throw error;
  }
};

// Xóa file local cũ
const deleteLocalFile = (publicId) => {
  try {
    const filePath = path.join(UPLOADS_DIR, publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Lỗi khi xóa file local:", err);
  }
};

// Main upload function — tự chọn Cloudinary hoặc local
export const uploadImage = async (buffer, options = {}) => {
  if (hasCloudinary()) {
    return await uploadToCloudinary(buffer, options);
  } else {
    const ext = options.mimetype
      ? options.mimetype.split("/")[1]
      : "jpg";
    const filename = options.public_id
      ? `${options.public_id}.${ext}`
      : `avatar_${Date.now()}.${ext}`;
    return await saveToLocal(buffer, filename);
  }
};

// Xóa ảnh cũ (Cloudinary hoặc local)
export const deleteImage = async (publicId) => {
  if (!publicId) return;
  if (hasCloudinary() && !publicId.includes(".")) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Lỗi khi xóa ảnh Cloudinary:", err);
    }
  } else {
    deleteLocalFile(publicId);
  }
};
