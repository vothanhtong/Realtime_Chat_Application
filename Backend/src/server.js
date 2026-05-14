import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import messageRoute from "./routes/messageRoute.js";
import conversationRoute from "./routes/conversationRoute.js";
import cookieParser from "cookie-parser";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import { app, server } from "./socket/index.js";
import { v2 as cloudinary } from "cloudinary";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5001;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Tắt CSP nếu cần cho Swagger UI
}));

// Rate limiting cho tất cả requests
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // giới hạn 1000 requests mỗi IP (tăng lên cho development)
  message: "Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting nghiêm ngặt hơn cho auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 50, // tăng lên 50 lần cho development
  message: "Quá nhiều lần đăng nhập/đăng ký, vui lòng thử lại sau 15 phút",
  skipSuccessfulRequests: true, // không đếm request thành công
});

app.use(generalLimiter);

// Compression middleware
app.use(compression());

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",").map(url => url.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Serve ảnh upload local (fallback khi không có Cloudinary)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger
const swaggerDocument = JSON.parse(fs.readFileSync("./src/swagger.json", "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Public routes với rate limiting
app.use("/api/auth", authLimiter, authRoute);

// Protected routes
app.use(protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/conversations", conversationRoute);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Lỗi hệ thống" });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server bắt đầu trên cổng ${PORT}`);
  });
});
