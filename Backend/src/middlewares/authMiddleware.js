import jwt from "jsonwebtoken";
import User from "../models/User.js";

// authorization - xác minh user là ai
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: "Không tìm thấy access token" });
    }

    // verify synchronous để catch được lỗi đúng cách
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Access token hết hạn hoặc không đúng" });
    }

    const user = await User.findById(decoded.userId).select("-hashedPassword");

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Lỗi khi xác minh JWT trong authMiddleware", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
