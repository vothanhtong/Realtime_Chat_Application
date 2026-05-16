import { AppError } from "../utils/AppError.js";

/**
 * Global Express error handler.
 * Must be registered LAST with app.use().
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
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

  // Multer errors
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }

  // Unknown / programming errors — don't leak details
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Lỗi hệ thống" });
};
