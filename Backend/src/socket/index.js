import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocketIO } from "../controllers/conversationController.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL?.split(","),
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const onlineUsers = new Map(); // { userId: socketId }

io.on("connection", async (socket) => {
  const user = socket.user;

  onlineUsers.set(user._id.toString(), socket.id);
  io.emit("online-users", Array.from(onlineUsers.keys()));

  // Join tất cả conversation rooms
  const conversationIds = await getUserConversationsForSocketIO(user._id);
  conversationIds.forEach((id) => socket.join(id));

  // Join room cá nhân để nhận direct events (new-group, v.v.)
  socket.join(user._id.toString());

  // Client tự join thêm room sau khi tạo conversation mới
  socket.on("join-conversation", (conversationId) => {
    // Chỉ join nếu user thực sự là member (validate async)
    getUserConversationsForSocketIO(user._id).then((ids) => {
      if (ids.includes(conversationId)) {
        socket.join(conversationId);
      }
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(user._id.toString());
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });
});

export { io, app, server };
