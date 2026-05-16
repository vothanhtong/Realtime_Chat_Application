import { AppError } from "../utils/AppError.js";

/**
 * Validation schemas — plain objects with validate() methods.
 * Keeps validation logic out of controllers without adding a heavy library.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{0,20}$/;
const MONGO_ID_RE = /^[a-f\d]{24}$/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const required = (value, name) => {
  if (value === undefined || value === null || value === "" || (typeof value === "string" && !value.trim())) {
    throw new AppError(`${name} là bắt buộc`, 400);
  }
};

const isString = (value, name) => {
  if (typeof value !== "string") throw new AppError(`${name} phải là chuỗi`, 400);
};

const maxLen = (value, max, name) => {
  if (value.length > max) throw new AppError(`${name} không được quá ${max} ký tự`, 400);
};

const minLen = (value, min, name) => {
  if (value.length < min) throw new AppError(`${name} phải có ít nhất ${min} ký tự`, 400);
};

export const isValidObjectId = (id) => MONGO_ID_RE.test(id);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const validateSignUp = (body) => {
  const { username, password, email, firstName, lastName } = body;

  required(username, "Username");
  required(password, "Mật khẩu");
  required(email, "Email");
  required(firstName, "Tên");
  required(lastName, "Họ");

  isString(username, "Username");
  isString(password, "Mật khẩu");
  isString(email, "Email");
  isString(firstName, "Tên");
  isString(lastName, "Họ");

  minLen(username.trim(), 3, "Username");
  maxLen(username.trim(), 30, "Username");
  minLen(password, 6, "Mật khẩu");
  maxLen(password, 128, "Mật khẩu");
  maxLen(firstName.trim(), 50, "Tên");
  maxLen(lastName.trim(), 50, "Họ");

  if (!EMAIL_RE.test(email)) throw new AppError("Email không hợp lệ", 400);
};

export const validateSignIn = (body) => {
  const { username, password } = body;
  required(username, "Email hoặc username");
  required(password, "Mật khẩu");
  isString(username, "Email hoặc username");
  isString(password, "Mật khẩu");
};

// ─── User ─────────────────────────────────────────────────────────────────────
export const validateUpdateProfile = (body) => {
  const { displayName, bio, phone } = body;

  if (displayName !== undefined) {
    isString(displayName, "Tên hiển thị");
    if (!displayName.trim()) throw new AppError("Tên hiển thị không được để trống", 400);
    maxLen(displayName.trim(), 100, "Tên hiển thị");
  }

  if (bio !== undefined) {
    isString(bio, "Bio");
    maxLen(bio, 500, "Bio");
  }

  if (phone !== undefined && phone !== "") {
    isString(phone, "Số điện thoại");
    if (!PHONE_RE.test(phone)) throw new AppError("Số điện thoại không hợp lệ", 400);
  }

  const hasUpdate = displayName !== undefined || bio !== undefined || phone !== undefined;
  if (!hasUpdate) throw new AppError("Không có thông tin nào để cập nhật", 400);
};

// ─── Friend ───────────────────────────────────────────────────────────────────
export const validateSendFriendRequest = (body) => {
  const { to } = body;
  required(to, "userId người nhận");
  if (!isValidObjectId(to)) throw new AppError("userId không hợp lệ", 400);

  if (body.message !== undefined) {
    isString(body.message, "Lời nhắn");
    maxLen(body.message, 300, "Lời nhắn");
  }
};

export const validateSetNickname = (body) => {
  if (body.nickname !== undefined && body.nickname !== null) {
    isString(body.nickname, "Nickname");
    maxLen(body.nickname, 50, "Nickname");
  }
};

// ─── Message ──────────────────────────────────────────────────────────────────
export const validateSendMessage = (body) => {
  const { content } = body;
  required(content, "Nội dung tin nhắn");
  isString(content, "Nội dung tin nhắn");
  if (!content.trim()) throw new AppError("Nội dung tin nhắn không được để trống", 400);
  maxLen(content.trim(), 5000, "Nội dung tin nhắn");
};

// ─── Conversation ─────────────────────────────────────────────────────────────
export const validateCreateConversation = (body) => {
  const { type, name, memberIds } = body;

  required(type, "Loại cuộc trò chuyện");
  if (!["direct", "group"].includes(type)) {
    throw new AppError("Loại cuộc trò chuyện không hợp lệ (direct | group)", 400);
  }

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw new AppError("Danh sách thành viên là bắt buộc", 400);
  }

  if (!memberIds.every(isValidObjectId)) {
    throw new AppError("Một hoặc nhiều memberIds không hợp lệ", 400);
  }

  if (type === "group") {
    required(name, "Tên nhóm");
    isString(name, "Tên nhóm");
    if (!name.trim()) throw new AppError("Tên nhóm không được để trống", 400);
    maxLen(name.trim(), 100, "Tên nhóm");
    if (memberIds.length < 2) {
      throw new AppError("Nhóm cần ít nhất 2 thành viên (ngoài bạn)", 400);
    }
  }
};
