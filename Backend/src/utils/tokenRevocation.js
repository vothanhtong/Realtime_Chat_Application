/**
 * true khi access token được phát hành trước lần đặt lại mật khẩu gần nhất.
 * So sánh theo GIÂY (JWT iat làm tròn xuống giây): token phát hành trong cùng
 * giây với lúc đổi mật khẩu — tức token mới của chính chủ — vẫn hợp lệ.
 *
 * @param {{ iat?: number }} decoded  payload JWT đã verify
 * @param {Date | undefined} passwordChangedAt
 */
export const isTokenRevoked = (decoded, passwordChangedAt) =>
  Boolean(
    passwordChangedAt &&
      typeof decoded.iat === "number" &&
      decoded.iat < Math.floor(passwordChangedAt.getTime() / 1000)
  );
