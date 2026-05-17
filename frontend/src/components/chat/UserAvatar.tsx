import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface IUserAvatarProps {
  type: "sidebar" | "chat" | "profile";
  name: string;
  avatarUrl?: string;
  className?: string;
  statusVisible?: boolean;
  isOwn?: boolean;
}

// Nếu URL là relative path, thêm backend base URL vào
const resolveAvatarUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("/uploads")) {
    const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5001";
    return `${base}${url}`;
  }
  if (url.includes("/uploads/avatars/")) {
    const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5001";
    const filename = url.split("/uploads/avatars/").pop();
    return `${base}/uploads/avatars/${filename}`;
  }
  return url;
};

const UserAvatar = ({
  type,
  name,
  avatarUrl,
  className,
  statusVisible = true,
  isOwn = false,
}: IUserAvatarProps) => {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  
  // Hide avatar image if user is incognito and it's not our own avatar
  const shouldHideImage = !statusVisible && !isOwn;
  const finalUrl = shouldHideImage ? undefined : resolvedUrl;
  
  const bgColor = !finalUrl ? "bg-primary/20" : "";

  if (!name) {
    name = "Moji";
  }

  return (
    <Avatar
      className={cn(
        "transition-all duration-300",
        type === "sidebar" && "size-10 sm:size-11 xl:size-13 text-base",
        type === "chat" && "size-8 xl:size-9 text-xs",
        type === "profile" && "size-24 xl:size-32 text-3xl shadow-xl ring-2 ring-background",
        className
      )}
    >
      <AvatarImage
        src={finalUrl}
        alt={name}
        className="object-cover"
      />
      <AvatarFallback className={cn(bgColor, "text-primary font-bold uppercase")}>
        {name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
