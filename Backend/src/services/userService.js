import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { getFriendIds } from "../utils/friendship.js";
import { validateUpdateProfile } from "../validators/index.js";
import { emitToAudience } from "../realtime/emitter.js";
import { storeImage, deleteImage } from "./storageService.js";
import { processAvatar, processChatImage } from "./mediaService.js";
import { presenceService } from "./presenceService.js";

const SAFE_FIELDS = "-hashedPassword";
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * "user-updated" (tên / avatar) — không còn io.emit toàn cục:
 *   - luôn gửi về chính user (đồng bộ các tab/thiết bị khác)
 *   - gửi tới bạn bè, TRỪ KHI user đang ẩn danh (statusVisible = false)
 * Thành viên nhóm không phải bạn bè sẽ thấy thay đổi ở lần tải lại danh sách.
 */
const broadcastProfileChange = async (user, patch) => {
  const userId = user._id.toString();
  try {
    const friendIds = user.statusVisible === false ? [] : await getFriendIds(userId);
    emitToAudience({ userIds: [userId, ...friendIds] }, "user-updated", { userId, ...patch });
  } catch (err) {
    console.error("broadcastProfileChange error:", err);
  }
};

export const userService = {
  /** GET /api/users/search?username= */
  async search(requesterId, rawKeyword) {
    // ?username=a&username=b → mảng; chỉ chấp nhận chuỗi
    if (typeof rawKeyword !== "string" || rawKeyword.trim().length < 1) {
      throw new AppError("Cần cung cấp username để tìm kiếm", 400);
    }
    const keyword = rawKeyword.trim();
    if (keyword.length > 50) throw new AppError("Từ khóa tìm kiếm không được quá 50 ký tự", 400);

    // Exact username OR partial displayName — metachar escaped (chặn ReDoS / injection)
    const user = await User.findOne({
      _id: { $ne: requesterId },
      $or: [
        { username: keyword.toLowerCase() },
        { displayName: { $regex: escapeRegex(keyword), $options: "i" } },
      ],
    })
      .select("_id username displayName avatarUrl statusVisible")
      .lean();

    if (!user) throw new AppError("Không tìm thấy người dùng", 404);
    return user;
  },

  /** PATCH /api/users/profile */
  async updateProfile(userId, body) {
    validateUpdateProfile(body);
    const { displayName, bio, phone } = body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (phone !== undefined) updates.phone = phone.trim() || undefined;

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select(SAFE_FIELDS)
      .lean();

    if (updates.displayName !== undefined) {
      await broadcastProfileChange(updated, { displayName: updated.displayName });
    }
    return updated;
  },

  /**
   * POST /api/users/uploadAvatar
   * Thứ tự chống race condition (trước đây: xoá ảnh cũ song song với upload ảnh
   * mới CÙNG public_id → có thể xoá nhầm chính ảnh vừa upload):
   *   1. upload ảnh mới với id có timestamp (luôn là asset mới, không ghi đè)
   *   2. cập nhật DB trỏ sang ảnh mới (lỗi → xoá ảnh mới vừa upload, rollback)
   *   3. CHỈ SAU ĐÓ mới xoá ảnh cũ (await; lỗi chỉ log, không làm hỏng request)
   */
  async uploadAvatar(user, file) {
    if (!file) throw new AppError("Không có file được upload", 400);

    const processed = await processAvatar(file.buffer);
    const stored = await storeImage(processed.buffer, {
      folder: "avatars",
      name: `user_${user._id}_${Date.now()}`,
    });

    let updated;
    try {
      updated = await User.findByIdAndUpdate(
        user._id,
        { avatarUrl: stored.url, avatarId: stored.storageId },
        { new: true }
      )
        .select(SAFE_FIELDS)
        .lean();
      if (!updated) throw new AppError("Người dùng không tồn tại", 404);
    } catch (error) {
      await deleteImage(stored.storageId).catch((err) =>
        console.error("Rollback avatar upload failed:", err)
      );
      throw error;
    }

    if (user.avatarId && user.avatarId !== stored.storageId) {
      try {
        await deleteImage(user.avatarId);
      } catch (err) {
        console.error("Lỗi khi xóa ảnh đại diện cũ:", err);
      }
    }

    await broadcastProfileChange(updated, { avatarUrl: updated.avatarUrl });
    return updated;
  },

  /** POST /api/users/uploadImage — chat attachment (giữ tỉ lệ, rộng tối đa 1280px) */
  async uploadChatImage(user, file) {
    if (!file) throw new AppError("Không có file được upload", 400);
    const processed = await processChatImage(file.buffer);
    const stored = await storeImage(processed.buffer, {
      folder: "chat",
      name: `msg_${user._id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });
    return { url: stored.url, width: processed.width, height: processed.height };
  },

  /** PATCH /api/users/status-visible — chế độ ẩn danh */
  async updateStatusVisibility(userId, statusVisible) {
    if (typeof statusVisible !== "boolean") {
      throw new AppError("statusVisible phải là boolean", 400);
    }

    const updated = await User.findByIdAndUpdate(userId, { statusVisible }, { new: true })
      .select(SAFE_FIELDS)
      .lean();

    // Chỉ phát presence tới bạn bè: bật ẩn danh = "offline", tắt = "online".
    // Không broadcast cờ statusVisible để không lộ việc user đang ẩn danh.
    presenceService.setVisibility(userId.toString(), statusVisible);
    return updated;
  },
};
