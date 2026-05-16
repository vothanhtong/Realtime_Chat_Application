import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the full user document (minus hashedPassword) to req.user.
 */
export const protectedRoute = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) throw new AppError("Không tìm thấy access token", 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new AppError("Access token hết hạn hoặc không hợp lệ", 403);
  }

  const user = await User.findById(decoded.userId)
    .select("-hashedPassword")
    .lean();

  if (!user) throw new AppError("Người dùng không tồn tại", 404);

  req.user = user;
  next();
});
