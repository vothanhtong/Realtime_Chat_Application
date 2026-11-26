import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String, // link CDN để hiển thị hình
    },
    avatarId: {
      type: String, // Cloudinary public_id để xoá hình
    },
    bio: {
      type: String,
      maxlength: 500, // tuỳ
    },
    phone: {
      type: String,
      sparse: true, // cho phép null, nhưng không được trùng
    },
    statusVisible: {
      type: Boolean,
      default: true,
    },
    // true khi quyền sở hữu email đã được chứng minh: đăng nhập OAuth có
    // email_verified, hoặc đặt lại mật khẩu thành công qua link gửi tới email.
    // Đăng ký bằng mật khẩu → false (chưa có luồng xác minh email).
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // Firebase UID đã liên kết với tài khoản này (Google/GitHub)
    firebaseUids: {
      type: [String],
      index: true,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Access token (JWT) phát hành TRƯỚC thời điểm này bị từ chối — đặt khi
    // đặt lại mật khẩu để token cũ của kẻ chiếm phiên mất hiệu lực ngay.
    passwordChangedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
export default User;