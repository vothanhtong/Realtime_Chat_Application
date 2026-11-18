/**
 * Whitelist for image URLs attached to chat messages.
 * Only URLs produced by this system's own upload endpoint are accepted:
 *   - Cloudinary:  https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/image/upload/...
 *   - Local disk:  /uploads/<folder>/<file>  (relative, as returned by saveToLocal)
 *                  or <SERVER_URL>/uploads/<folder>/<file>
 */

const LOCAL_UPLOAD_PATH_RE = /^\/uploads\/[a-z0-9_-]+\/[A-Za-z0-9_.-]+$/;
const MAX_URL_LENGTH = 2048;

const isLocalUploadPath = (pathname) =>
  LOCAL_UPLOAD_PATH_RE.test(pathname) && !pathname.includes("..");

export const isAllowedImageUrl = (value) => {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return false;

  if (value.startsWith("/")) return isLocalUploadPath(value);

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (
    cloudName &&
    url.protocol === "https:" &&
    url.hostname === "res.cloudinary.com" &&
    url.pathname.startsWith(`/${cloudName}/image/upload/`)
  ) {
    return true;
  }

  const serverUrl = process.env.SERVER_URL;
  if (serverUrl) {
    try {
      if (url.origin === new URL(serverUrl).origin && isLocalUploadPath(url.pathname)) {
        return true;
      }
    } catch {
      // SERVER_URL misconfigured — fall through to reject
    }
  }

  return false;
};
