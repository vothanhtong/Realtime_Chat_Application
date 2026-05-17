import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { v2 as cloudinary } from "cloudinary";

import { connectDB } from "./libs/db.js";
import { io, app, server } from "./socket/index.js";
import { initializeFirebase } from "./config/firebase.js";

// Gắn io vào app để dùng trong controllers mà không bị circular dependency
app.set("io", io);

import { errorHandler } from "./middlewares/errorHandler.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import { initPassport } from "./controllers/oauthController.js";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import messageRoute from "./routes/messageRoute.js";
import conversationRoute from "./routes/conversationRoute.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5001;

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// Lightweight NoSQL injection prevention for req.body.
// express-mongo-sanitize is incompatible with Express 5 (req.query is read-only).
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    const sanitize = (obj) => {
      for (const key of Object.keys(obj)) {
        if (key.startsWith("$") || key.includes(".")) {
          delete obj[key];
        } else if (obj[key] !== null && typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Too many attempts, please try again later" },
  skipSuccessfulRequests: true,
});

app.use(generalLimiter);

// ─── Core middlewares ─────────────────────────────────────────────────────────

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const allowedOrigins = process.env.CLIENT_URL?.split(",").map((u) => u.trim()) ?? [];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Passport (OAuth) ─────────────────────────────────────────────────────────

initPassport(app);

// ─── Firebase Admin (OAuth) ───────────────────────────────────────────────────

initializeFirebase();

// ─── Cloudinary ───────────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Static files ─────────────────────────────────────────────────────────────

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Swagger ──────────────────────────────────────────────────────────────────

try {
  const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, "swagger.json"), "utf8")
  );
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch {
  console.warn("swagger.json not found — /api-docs disabled");
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public routes (auth limiter applied)
app.use("/api/auth", authLimiter, authRoute);

// Protected routes (JWT required)
app.use(protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/conversations", conversationRoute);

// ─── Global error handler (must be last) ─────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

// Handle port conflicts — auto-switch to next available port
let currentPort = Number(PORT);
const MAX_PORT_RETRIES = 10;
let portAttempt = 0;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && portAttempt < MAX_PORT_RETRIES) {
    portAttempt++;
    currentPort++;
    console.warn(`⚠️  Port ${currentPort - 1} is in use — trying port ${currentPort}...`);
    server.listen(currentPort);
  } else if (err.code === "EADDRINUSE") {
    console.error(`❌ No available port found after ${MAX_PORT_RETRIES} attempts. Exiting.`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
    process.exit(1);
  }
});

server.on("listening", () => {
  console.log(`✅ Server running on port ${currentPort}`);
});

// Graceful shutdown — prevents orphaned processes holding the port
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

connectDB().then(() => {
  server.listen(currentPort);
});
