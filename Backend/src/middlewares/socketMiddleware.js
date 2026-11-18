import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Socket.IO authentication middleware.
 * Reads the JWT from socket.handshake.auth.token and attaches
 * the user document to socket.data.user.
 *
 * socket.data (không phải socket.user) vì connectionStateRecovery với
 * skipMiddlewares: true bỏ qua middleware khi khôi phục kết nối — Socket.IO chỉ
 * khôi phục id, rooms và socket.data. Thuộc tính tự đặt như socket.user sẽ mất.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized: token không tồn tại"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return next(new Error("Unauthorized: token không hợp lệ hoặc đã hết hạn"));
    }

    const user = await User.findById(decoded.userId)
      .select("-hashedPassword")
      .lean();

    if (!user) return next(new Error("Unauthorized: user không tồn tại"));

    socket.data.user = user;
    next();
  } catch (error) {
    console.error("Lỗi socketAuthMiddleware:", error);
    next(new Error("Unauthorized"));
  }
};
