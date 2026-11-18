// PHẢI là import đầu tiên — nạp .env trước khi mọi module khác đọc process.env
import "./env.js";

import http from "http";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import { createApp } from "./app.js";
import { connectDB } from "./libs/db.js";
import { initSocket } from "./socket/index.js";
import { initializeFirebase } from "./config/firebase.js";
import { IS_PRODUCTION } from "./config/constants.js";

// ─── Fail fast on missing configuration ───────────────────────────────────────
const REQUIRED_ENV = ["MONGODB_CONNECTIONSTRING", "ACCESS_TOKEN_SECRET", "CLIENT_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Thiếu biến môi trường bắt buộc: ${missing.join(", ")} (xem Backend/.env.example)`);
  process.exit(1);
}

// ─── Third-party SDKs ─────────────────────────────────────────────────────────
initializeFirebase();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── App, HTTP server, Socket.IO ──────────────────────────────────────────────
// app.js dựng Express (test được độc lập); server.js sở hữu httpServer và truyền
// nó cho socket layer. Services emit qua realtime/emitter (initSocket gọi setIO).
const app = createApp();
const server = http.createServer(app);
const io = initSocket(server);

// ─── Start ────────────────────────────────────────────────────────────────────
let currentPort = Number(process.env.PORT) || 5001;
const MAX_PORT_RETRIES = 10;
let portAttempt = 0;

server.on("error", (err) => {
  // Tự nhảy port chỉ là tiện ích khi dev; production phải bind ĐÚNG $PORT
  if (err.code === "EADDRINUSE" && !IS_PRODUCTION && portAttempt < MAX_PORT_RETRIES) {
    portAttempt++;
    currentPort++;
    console.warn(`⚠️  Port ${currentPort - 1} is in use — trying port ${currentPort}...`);
    server.listen(currentPort);
    return;
  }
  console.error("❌ Server error:", err);
  process.exit(1);
});

server.on("listening", () => console.log(`✅ Server running on port ${currentPort}`));

// Graceful shutdown — đóng socket, HTTP server và kết nối DB
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  setTimeout(() => process.exit(1), 5000).unref();
  io.close(() => {
    mongoose.connection
      .close()
      .catch(() => {})
      .finally(() => {
        console.log("Server closed.");
        process.exit(0);
      });
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));

connectDB().then(() => server.listen(currentPort));
