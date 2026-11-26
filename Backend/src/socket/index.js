import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { messageService } from "../services/messageService.js";
import { conversationService } from "../services/conversationService.js";
import { presenceService } from "../services/presenceService.js";
import { userService } from "../services/userService.js";
import { setIO, userRoom, conversationRoom } from "../realtime/emitter.js";
import { AppError } from "../utils/AppError.js";
import { createSocketRateLimiter } from "../utils/socketRateLimiter.js";
import { SOCKET_RATE_LIMITS } from "../config/constants.js";

/**
 * Socket transport layer: authenticates sockets, manages rooms, and maps events
 * to services. Holds no business logic of its own.
 *
 * @param {import('http').Server} httpServer created in server.js
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      // CLIENT_URL là list phân cách bằng dấu phẩy
      origin: process.env.CLIENT_URL?.split(",").map((u) => u.trim()).filter(Boolean),
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  // No Redis adapter — single-process in-memory mode
  io.use(socketAuthMiddleware);
  io.on("connection", (socket) => handleConnection(socket));

  setIO(io); // services emit through realtime/emitter
  return io;
};

const handleConnection = async (socket) => {
  // socket.data được khôi phục cùng connection state recovery (xem socketMiddleware)
  const user = socket.data.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }
  const userId = user._id.toString();

  // LƯU Ý: mọi socket.on(...) phải được đăng ký ĐỒNG BỘ trước bất kỳ await nào.
  // Client nhận "connect" ngay khi middleware cho qua; event tới trước khi handler
  // tồn tại sẽ bị bỏ rơi. Phần khởi tạo bất đồng bộ (join rooms) nằm ở cuối.

  // Room cá nhân: mọi event gửi riêng cho user (new-group, presence, user-updated...)
  socket.join(userRoom(userId));

  // Presence: socket mới → user vừa đọc từ DB ở middleware, đăng ký ngay (đồng bộ).
  // Socket KHÔI PHỤC (skipMiddlewares) mang socket.data.user cũ từ lúc kết nối
  // ban đầu — statusVisible có thể đã đổi (bật ẩn danh) → đọc lại từ DB trước,
  // nếu không sẽ báo "online" cho bạn bè dù user đang ẩn danh.
  let presenceRegistered = false;
  const registerPresence = (statusVisible) => {
    presenceRegistered = true;
    presenceService.handleConnection(userId, statusVisible);
  };
  if (!socket.recovered) registerPresence(user.statusVisible);

  const typingIn = new Set(); // conversation mà socket này đang "đang soạn tin"
  socket.on("disconnecting", () => {
    // Rooms vẫn còn ở "disconnecting" → báo dừng typing cho mọi phòng liên quan
    typingIn.forEach((conversationId) => {
      socket
        .to(conversationRoom(conversationId))
        .emit("user-stop-typing", { conversationId, userId: user._id });
    });
    typingIn.clear();
  });

  // Fallback cho client: server đã tự join khi tạo phòng (emitter.joinUsersToConversation)
  socket.on("join-conversation", async (conversationId) => {
    try {
      if (await conversationService.isMember(user._id, conversationId)) {
        socket.join(conversationRoom(conversationId));
      }
    } catch (error) {
      console.error("join-conversation error:", error);
    }
  });

  // Rate limiters — bộ đếm riêng cho mỗi socket, tự giải phóng khi socket đóng
  const allowSendMessage = createSocketRateLimiter(SOCKET_RATE_LIMITS.sendMessage);
  const allowTyping = createSocketRateLimiter(SOCKET_RATE_LIMITS.typing);
  const allowStopTyping = createSocketRateLimiter(SOCKET_RATE_LIMITS.typing);

  socket.on("send-message", async (payload, callback) => {
    const reply = typeof callback === "function" ? callback : () => {};

    if (!allowSendMessage()) {
      return reply({ success: false, error: "Bạn gửi tin nhắn quá nhanh, vui lòng chậm lại" });
    }
    if (!payload || typeof payload !== "object") {
      return reply({ success: false, error: "Dữ liệu không hợp lệ" });
    }

    try {
      const { conversationId, recipientId, content, type, imgUrl } = payload;
      // Cùng service với REST: kiểm tra bạn bè/thành viên, content, imgUrl
      const { message } = await messageService.send(user, {
        type,
        conversationId,
        recipientId,
        content,
        imgUrl,
      });
      reply({ success: true, message });
    } catch (error) {
      if (error instanceof AppError) return reply({ success: false, error: error.message });
      console.error("Socket send-message error:", error);
      reply({ success: false, error: "Lỗi hệ thống" });
    }
  });

  // Typing — membership kiểm tra bằng room đã join, không query DB mỗi phím
  const isMemberRoom = (conversationId) =>
    typeof conversationId === "string" && socket.rooms.has(conversationRoom(conversationId));

  socket.on("typing", (conversationId) => {
    if (!allowTyping() || !isMemberRoom(conversationId)) return;
    typingIn.add(conversationId);
    socket.to(conversationRoom(conversationId)).emit("user-typing", {
      conversationId,
      userId: user._id,
      displayName: user.displayName,
    });
  });

  socket.on("stop-typing", (conversationId) => {
    if (!allowStopTyping() || !isMemberRoom(conversationId)) return;
    typingIn.delete(conversationId);
    socket.to(conversationRoom(conversationId)).emit("user-stop-typing", {
      conversationId,
      userId: user._id,
    });
  });

  // Không có listener "profile-updated" / "toggle-status-visibility": mọi thay đổi
  // hồ sơ & chế độ ẩn danh đi qua REST → userService (cập nhật DB rồi mới phát).

  socket.on("disconnect", () => {
    if (presenceRegistered) presenceService.handleDisconnect(userId);
  });

  // ─── Khởi tạo bất đồng bộ (sau khi đã đăng ký xong handler) ────────────────
  if (socket.recovered) {
    try {
      const fresh = await userService.getSocketProfile(userId);
      if (!fresh) {
        socket.disconnect(true);
        return;
      }
      socket.data.user = { ...user, ...fresh };
      // Socket có thể đã ngắt trong lúc chờ DB — khi đó không đăng ký presence
      if (socket.connected) registerPresence(fresh.statusVisible);
    } catch (error) {
      console.error("Socket recovery presence error:", error);
      // Không đọc được DB: an toàn mặc định = coi như đang ẩn danh
      if (socket.connected) registerPresence(false);
    }
  }

  try {
    // Khi recovered, rooms đã được khôi phục sẵn — join lại là no-op
    const conversationIds = await conversationService.getUserConversationIds(user._id);
    conversationIds.forEach((id) => socket.join(conversationRoom(id)));

    // Chỉ bạn bè đang online & không ẩn danh
    socket.emit("online-users", await presenceService.getOnlineFriends(userId));
  } catch (error) {
    console.error("Socket init error:", error);
  }
};
