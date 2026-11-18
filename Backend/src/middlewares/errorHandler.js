import { AppError } from "../utils/AppError.js";

/**
 * Global Express error handler.
 * Must be registered LAST with app.use().
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Operational errors (AppError) — safe to expose message
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `${field} đã tồn tại` });
  }

  // Mongoose invalid ObjectId (CastError) — client sent malformed input
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
  }

  // Multer errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      const limit = req.uploadLimitMB ? ` (tối đa ${req.uploadLimitMB}MB)` : "";
      return res.status(413).json({ message: `File quá lớn${limit}` });
    }
    return res.status(400).json({ message: "File upload không hợp lệ" });
  }

  // body-parser: JSON body vượt express.json({ limit }) / JSON sai cú pháp
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Dữ liệu gửi lên quá lớn" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON không hợp lệ" });
  }

  // Cloudinary rejects the uploaded file (corrupt/invalid image)
  if (err.http_code === 400) {
    return res.status(400).json({ message: "File ảnh không hợp lệ hoặc bị hỏng" });
  }

  // JWT errors — 401 (chưa xác thực); 403 dành riêng cho lỗi phân quyền
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }

  // Unknown / programming errors — don't leak details
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Lỗi hệ thống" });
};
