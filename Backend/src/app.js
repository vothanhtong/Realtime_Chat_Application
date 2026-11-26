import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import mongoose from "mongoose";

import { errorHandler } from "./middlewares/errorHandler.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import { UPLOADS_ROOT } from "./services/storageService.js";
import { JSON_BODY_LIMIT, IS_PRODUCTION } from "./config/constants.js";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import messageRoute from "./routes/messageRoute.js";
import conversationRoute from "./routes/conversationRoute.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Strip `$`-prefixed / dotted keys from req.body (NoSQL operator injection) */
const sanitizeBody = (req, _res, next) => {
  const sanitize = (obj) => {
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) delete obj[key];
      else if (obj[key] !== null && typeof obj[key] === "object") sanitize(obj[key]);
    }
  };
  if (req.body && typeof req.body === "object") sanitize(req.body);
  next();
};

/**
 * Build the Express application — no DB connection, no listen(), no socket.
 * server.js wires it to an HTTP server; tests mount it with supertest.
 *
 * @param {{ rateLimit?: boolean }} options  rateLimit=false for tests only
 */
export const createApp = ({ rateLimit: enableRateLimit = true } = {}) => {
  const app = express();

  // Tin 1 hop reverse proxy (Render/Vercel/Nginx) — bắt buộc để req.ip là IP thật
  // từ X-Forwarded-For; nếu không express-rate-limit gộp mọi user vào IP của proxy.
  app.set("trust proxy", 1);

  // ─── Health check (trước rate limit — Render ping thường xuyên) ───────────
  app.get("/api/health", (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp });
  });

  // ─── Security ─────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // API thuần JSON, không render HTML
    })
  );

  const allowedOrigins = process.env.CLIENT_URL?.split(",").map((u) => u.trim()).filter(Boolean) ?? [];
  // CORS trước rate limit → response 429 vẫn có header CORS (trình duyệt đọc được lỗi)
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ─── Rate limiting ────────────────────────────────────────────────────────
  const authLimiter = enableRateLimit
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
        message: { message: "Quá nhiều lần thử, vui lòng thử lại sau" },
        skipSuccessfulRequests: true,
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (_req, _res, next) => next();

  // forgot-password luôn trả 200 (chống dò email) và signup thành công cũng 200/201
  // → authLimiter (skipSuccessfulRequests) không bao giờ đếm chúng. Limiter riêng
  // đếm MỌI request: chặn spam email đặt lại mật khẩu & tạo tài khoản hàng loạt.
  const strictLimiter = (windowMs, max, message) =>
    enableRateLimit
      ? rateLimit({ windowMs, max, message: { message }, standardHeaders: true, legacyHeaders: false })
      : (_req, _res, next) => next();
  const forgotPasswordLimiter = strictLimiter(
    15 * 60 * 1000,
    5,
    "Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần, vui lòng thử lại sau 15 phút"
  );
  const signUpLimiter = strictLimiter(
    60 * 60 * 1000,
    10,
    "Quá nhiều lần đăng ký từ địa chỉ này, vui lòng thử lại sau"
  );

  if (enableRateLimit) {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        message: { message: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
  }

  // ─── Core middlewares ─────────────────────────────────────────────────────
  app.use(compression());
  // 1mb: API chỉ nhận text/JSON — ảnh đi qua multipart (multer, giới hạn riêng)
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
  app.use(sanitizeBody);
  app.use(cookieParser());

  // ─── Static files (ảnh lưu local khi không cấu hình Cloudinary) ───────────
  app.use("/uploads", express.static(UPLOADS_ROOT, { maxAge: "7d", immutable: true }));

  // ─── API docs: mặc định tắt ở production (API_DOCS_ENABLED=true để bật) ───
  const docsEnabled = process.env.API_DOCS_ENABLED
    ? process.env.API_DOCS_ENABLED === "true"
    : !IS_PRODUCTION;
  if (docsEnabled) {
    try {
      const swaggerDocument = JSON.parse(
        fs.readFileSync(path.join(__dirname, "swagger.json"), "utf8")
      );
      app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch {
      console.warn("swagger.json not found — /api-docs disabled");
    }
  }

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use("/api/auth/forgot-password", forgotPasswordLimiter);
  app.use("/api/auth/signup", signUpLimiter);
  app.use("/api/auth", authLimiter, authRoute);

  // Protected routes — gắn protectedRoute từng prefix để request tới route
  // KHÔNG tồn tại rơi xuống 404 thay vì bị 401 chặn trước
  app.use("/api/users", protectedRoute, userRoute);
  app.use("/api/friends", protectedRoute, friendRoute);
  app.use("/api/messages", protectedRoute, messageRoute);
  app.use("/api/conversations", protectedRoute, conversationRoute);

  app.use((_req, res) => res.status(404).json({ message: "Route không tồn tại" }));

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};
