import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface IUserAvatarProps {
  type: "sidebar" | "chat" | "profile";
  name: string;
  avatarUrl?: string;
  className?: string;
}

// Nếu URL là relative path, thêm backend base URL vào
const resolveAvatarUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("/uploads")) {
    const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5001";
    return `${base}${url}`;
  }
  return url;
};

const UserAvatar = ({ type, name, avatarUrl, className }: IUserAvatarProps) => {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const bgColor = !resolvedUrl ? "bg-blue-500" : "";

  if (!name) {
    name = "Moji";
  }

  return (
    <Avatar
      className={cn(
        className ?? "",
        type === "sidebar" && "size-12 text-base",
        type === "chat" && "size-8 text-sm",
        type === "profile" && "size-24 text-3xl shadow-md"
      )}
    >
      <AvatarImage
        src={resolvedUrl}
        alt={name}
      />
      <AvatarFallback className={`${bgColor} text-white font-semibold`}>
        {name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
