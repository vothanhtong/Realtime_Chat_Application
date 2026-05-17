import { useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { getThumbnailUrl, getFullUrl } from "@/lib/cloudinaryUtils";

interface OptimizedImageProps {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
}

const OptimizedImage = ({
  src,
  alt = "image",
  className,
  containerClassName,
  onClick,
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Use thumbnail logic if it's a Cloudinary URL, otherwise use original
  const isCloudinary = src.includes("res.cloudinary.com");
  const thumbnailUrl = isCloudinary ? getThumbnailUrl(src) : src;
  const fullUrl = isCloudinary ? getFullUrl(src) : src;

  return (
    <div className={cn("relative overflow-hidden rounded-lg group", containerClassName)}>
      {!loaded && !error && (
        <Skeleton className="absolute inset-0 z-10 w-full h-full" />
      )}
      
      {error ? (
        <div className="flex items-center justify-center bg-muted aspect-video text-muted-foreground text-xs italic rounded-lg border border-dashed">
          Không thể tải ảnh
        </div>
      ) : (
        <img
          src={loaded ? fullUrl : thumbnailUrl}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          onClick={onClick}
          className={cn(
            "w-full h-auto object-cover transition-all duration-700",
            !loaded ? "blur-sm scale-105" : "blur-0 scale-100",
            onClick && "cursor-zoom-in hover:brightness-90",
            className
          )}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
