import User from "../models/User.js";
import { upload, uploadImage, deleteImage } from "../middlewares/uploadMiddleware.js";

// GET /api/users/me
export const authMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("Lỗi khi gọi authMe", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// GET /api/users/search?username=xxx
export const searchByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim().length < 1) {
      return res.status(400).json({ message: "Cần cung cấp username để tìm kiếm" });
    }

    const keyword = username.trim();

    // Tìm chính xác theo username HOẶC tìm gần đúng theo displayName (case-insensitive)
    const user = await User.findOne({
      _id: { $ne: req.user._id },
      $or: [
        { username: keyword.toLowerCase() },
        { displayName: { $regex: keyword, $options: "i" } },
      ],
    }).select("_id username displayName avatarUrl");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm user", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// PATCH /api/users/profile — cập nhật displayName, bio, phone
export const updateProfile = async (req, res) => {
  try {
    const { displayName, bio, phone } = req.body;
    const userId = req.user._id;

    // Chỉ cho phép update các field an toàn
    const updates = {};

    if (displayName !== undefined) {
      if (!displayName.trim()) {
        return res.status(400).json({ message: "Tên hiển thị không được để trống" });
      }
      updates.displayName = displayName.trim();
    }

    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({ message: "Bio không được quá 500 ký tự" });
      }
      updates.bio = bio.trim();
    }

    if (phone !== undefined) {
      // Validate phone đơn giản
      const phoneRegex = /^[0-9+\-\s()]{0,20}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
      }
      updates.phone = phone.trim() || undefined;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Không có thông tin nào để cập nhật" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-hashedPassword");

    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: updated,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật profile", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// POST /api/users/uploadAvatar
export const uploadAvatar = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Không có file được upload" });
      }

      const user = req.user;

      // Xóa ảnh cũ nếu có
      if (user.avatarId) {
        await deleteImage(user.avatarId);
      }

      // Upload ảnh mới (Cloudinary hoặc local tự động)
      const result = await uploadImage(req.file.buffer, {
        public_id: `user_${user._id}`,
        mimetype: req.file.mimetype,
        overwrite: true,
      });

      // Cập nhật user trong DB
      const updated = await User.findByIdAndUpdate(
        user._id,
        {
          avatarUrl: result.secure_url,
          avatarId: result.public_id,
        },
        { new: true }
      ).select("-hashedPassword");

      return res.status(200).json({
        message: "Upload avatar thành công",
        avatarUrl: updated.avatarUrl,
        user: updated,
      });
    } catch (error) {
      console.error("Lỗi khi upload avatar", error);
      return res.status(500).json({ message: error.message || "Lỗi hệ thống" });
    }
  },
];
