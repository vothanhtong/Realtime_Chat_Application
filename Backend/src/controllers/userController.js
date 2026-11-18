import { asyncHandler } from "../utils/asyncHandler.js";
import { avatarUpload, chatImageUpload } from "../middlewares/uploadMiddleware.js";
import { userService } from "../services/userService.js";

// HTTP concerns only. Business logic → userService.

// GET /api/users/me
export const authMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

// GET /api/users/search?username=xxx
export const searchByUsername = asyncHandler(async (req, res) => {
  const user = await userService.search(req.user._id, req.query.username);
  res.status(200).json({ user });
});

// PATCH /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.status(200).json({ message: "Cập nhật thông tin thành công", user });
});

// POST /api/users/uploadAvatar
// avatarUpload = multer (≤2MB) + kiểm tra magic bytes
export const uploadAvatar = [
  ...avatarUpload,
  asyncHandler(async (req, res) => {
    const user = await userService.uploadAvatar(req.user, req.file);
    res.status(200).json({ message: "Upload avatar thành công", avatarUrl: user.avatarUrl, user });
  }),
];

// POST /api/users/uploadImage
// chatImageUpload = multer (≤5MB) + kiểm tra magic bytes
export const uploadChatMessageImage = [
  ...chatImageUpload,
  asyncHandler(async (req, res) => {
    const { url, width, height } = await userService.uploadChatImage(req.user, req.file);
    res.status(200).json({ url, width, height });
  }),
];

// PATCH /api/users/status-visible
export const updateStatusVisibility = asyncHandler(async (req, res) => {
  const user = await userService.updateStatusVisibility(req.user._id, req.body.statusVisible);
  res.status(200).json({ message: "Cập nhật trạng thái hiển thị thành công", user });
});
