import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isTokenRevoked } from "../utils/tokenRevocation.js";

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
    // 401 thay vì 403: frontend axios chỉ refresh/logout khi nhận 401,
    // còn 403 dành cho lỗi phân quyền thật sự
    throw new AppError("Access token hết hạn hoặc không hợp lệ", 401);
  }

  const user = await User.findById(decoded.userId)
    .select("-hashedPassword +passwordChangedAt")
    .lean();

  if (!user) throw new AppError("Người dùng không tồn tại", 404);

  const { passwordChangedAt, ...safeUser } = user;
  if (isTokenRevoked(decoded, passwordChangedAt)) {
    throw new AppError("Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại", 401);
  }

  req.user = safeUser;
  next();
});
