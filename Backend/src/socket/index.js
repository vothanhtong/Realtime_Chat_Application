import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocketIO } from "../controllers/conversationController.js";
import Conversation from "../models/Conversation.js";
import { saveAndBroadcastMessage } from "../utils/messageHelper.js";
import { presenceService } from "../services/presenceService.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL?.split(","),
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// No Redis adapter — single-process in-memory mode

io.use(socketAuthMiddleware);

io.on("connection", async (socket) => {
  const user = socket.user;
  const userId = user._id.toString();

  // Track presence
  await presenceService.handleConnection(io, userId, user.statusVisible);

  // Gửi danh sách online ban đầu
  const onlineUsers = await presenceService.getOnlineUsers();
  socket.emit("online-users", onlineUsers);

  // Join tất cả conversation rooms
  const conversationIds = await getUserConversationsForSocketIO(user._id);
  conversationIds.forEach((id) => socket.join(id));

  // Join room cá nhân để nhận direct events (new-group, v.v.)
  socket.join(userId);

  // Client tự join thêm room sau khi tạo conversation mới
  socket.on("join-conversation", (conversationId) => {
    getUserConversationsForSocketIO(user._id).then((ids) => {
      if (ids.includes(conversationId)) {
        socket.join(conversationId);
      }
    });
  });

  socket.on("send-message", async (payload, callback) => {
    try {
      const { conversationId, recipientId, content, type, imgUrl } = payload;
      const { message } = await saveAndBroadcastMessage(io, {
        senderId: user._id,
        conversationId,
        recipientId,
        content,
        type,
        imgUrl,
      });

      if (callback) callback({ success: true, message });
    } catch (error) {
      console.error("Socket send-message error:", error.message);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Typing indicators
  socket.on("typing", async (conversationId) => {
    const isMember = await Conversation.exists({
      _id: conversationId,
      "participants.userId": user._id,
    });
    if (!isMember) return;

    socket.to(conversationId).emit("user-typing", {
      conversationId,
      userId: user._id,
      displayName: user.displayName,
    });
  });

  socket.on("stop-typing", (conversationId) => {
    socket.to(conversationId).emit("user-stop-typing", {
      conversationId,
      userId: user._id,
    });
  });

  // Handle status visibility toggle
  socket.on("toggle-status-visibility", async (visible) => {
    await presenceService.updateVisibility(io, userId, visible);
  });

  // Handle profile updates broadcast
  socket.on("profile-updated", (data) => {
    io.emit("user-updated", data);
  });

  socket.on("disconnect", async () => {
    await presenceService.handleDisconnect(io, userId);
  });
});

export { io, app, server };
