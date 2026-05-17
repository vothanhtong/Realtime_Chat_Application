import User from "../models/User.js";
import { upload, uploadImage, deleteImage } from "../middlewares/uploadMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { validateUpdateProfile } from "../middlewares/validate.js";
import { presenceService } from "../services/presenceService.js";
import { getUserConversationsForSocketIO } from "./conversationController.js";

// GET /api/users/me
export const authMe = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: req.user });
});

// GET /api/users/search?username=xxx
export const searchByUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (!username || username.trim().length < 1) {
    throw new AppError("Cần cung cấp username để tìm kiếm", 400);
  }

  const keyword = username.trim();

  // Exact match on username OR partial match on displayName (case-insensitive)
  const user = await User.findOne({
    _id: { $ne: req.user._id },
    $or: [
      { username: keyword.toLowerCase() },
      { displayName: { $regex: keyword, $options: "i" } },
    ],
  })
    .select("_id username displayName avatarUrl statusVisible")
    .lean();

  if (!user) throw new AppError("Không tìm thấy người dùng", 404);

  return res.status(200).json({ user });
});

// PATCH /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  validateUpdateProfile(req.body);

  const { displayName, bio, phone } = req.body;
  const updates = {};

  if (displayName !== undefined) updates.displayName = displayName.trim();
  if (bio !== undefined) updates.bio = bio.trim();
  if (phone !== undefined) updates.phone = phone.trim() || undefined;

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .select("-hashedPassword")
    .lean();

  const responseData = {
    message: "Cập nhật thông tin thành công",
    user: updated,
  };

  // Real-time broadcast: Notify all connected users about the name change
  const io = req.app.get("io");
  io.emit("user-updated", {
    userId: req.user._id,
    displayName: updated.displayName,
  });

  return res.status(200).json(responseData);
});

// POST /api/users/uploadAvatar
export const uploadAvatar = [
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("Không có file được upload", 400);

    const user = req.user;

    // Delete old avatar (non-blocking — don't fail the request if this errors)
    if (user.avatarId) {
      deleteImage(user.avatarId).catch((err) =>
        console.error("Lỗi khi xóa ảnh cũ:", err)
      );
    }

    const result = await uploadImage(req.file.buffer, {
      public_id: `user_${user._id}`,
      mimetype: req.file.mimetype,
      overwrite: true,
    });

    const updated = await User.findByIdAndUpdate(
      user._id,
      { avatarUrl: result.secure_url, avatarId: result.public_id },
      { new: true }
    )
      .select("-hashedPassword")
      .lean();

    const response = res.status(200).json({
      message: "Upload avatar thành công",
      avatarUrl: updated.avatarUrl,
      user: updated,
    });

    // Real-time broadcast: Notify all connected users about the avatar change
    const io = req.app.get("io");
    io.emit("user-updated", {
      userId: user._id,
      avatarUrl: updated.avatarUrl,
    });

    return response;
  }),
];

// POST /api/users/uploadImage
export const uploadChatMessageImage = [
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("Không có file được upload", 400);

    const result = await uploadImage(req.file.buffer, {
      folder: "chat_messages",
      mimetype: req.file.mimetype,
    });

    return res.status(200).json({
      url: result.secure_url,
    });
  }),
];

// PATCH /api/users/status-visibility
export const updateStatusVisibility = asyncHandler(async (req, res) => {
  const { statusVisible } = req.body;
  if (typeof statusVisible !== "boolean") {
    throw new AppError("statusVisible phải là boolean", 400);
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { statusVisible },
    { new: true }
  )
    .select("-hashedPassword")
    .lean();

  // Real-time sync: Update presence visibility and broadcast
  const io = req.app.get("io");
  await presenceService.updateVisibility(io, req.user._id.toString(), statusVisible);

  const responseData = res.status(200).json({
    message: "Cập nhật trạng thái hiển thị thành công",
    user: updated,
  });

  // Real-time broadcast: Notify all connected users about the visibility change
  io.emit("user-updated", {
    userId: req.user._id,
    statusVisible: statusVisible,
  });

  return responseData;
});
