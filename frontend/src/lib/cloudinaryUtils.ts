/**
 * Injects Cloudinary transformation parameters into a URL.
 * Works only if the URL is a Cloudinary URL.
 */
export const getCloudinaryUrl = (
  url: string | undefined,
  {
    width,
    height,
    quality = "auto",
    format = "auto",
    crop = "fill",
    gravity = "auto",
  }: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
    gravity?: string;
  } = {}
) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  // Cloudinary URL format: https://res.cloudinary.com/[cloud_name]/image/upload/[transformations]/v[version]/[public_id].[ext]
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  const transformations = [
    `q_${quality}`,
    `f_${format}`,
    width ? `w_${width}` : "",
    height ? `h_${height}` : "",
    width || height ? `c_${crop}` : "",
    width || height ? `g_${gravity}` : "",
  ]
    .filter(Boolean)
    .join(",");

  return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

/**
 * Returns a small, low-quality version for previews/thumbnails.
 */
export const getThumbnailUrl = (url: string | undefined) =>
  getCloudinaryUrl(url, { width: 400, quality: "auto:eco" });

/**
 * Returns the optimized full-resolution version.
 */
export const getFullUrl = (url: string | undefined) =>
  getCloudinaryUrl(url, { quality: "auto:best" });
