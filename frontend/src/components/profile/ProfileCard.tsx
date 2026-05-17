import type { User } from "@/types/user";
import { Card, CardContent } from "../ui/card";
import UserAvatar from "../chat/UserAvatar";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { useSocketStore } from "@/stores/useSocketStore";
import { useAuthStore } from "@/stores/useAuthStore";
import AvatarUploader from "./AvatarUploader";

interface ProfileCardProps {
  user: User | null;
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  const { onlineUsers, socket } = useSocketStore();
  const { user: authUser } = useAuthStore();

  if (!user) return null;

  const isMe = authUser?._id === user._id;
  const bio = user.bio || "Will code for food 💻";
  
  // A user is online if they are in the list OR if it's me and my socket is connected
  // And must also not be hidden
  const isOnline = (onlineUsers.includes(user._id) || (isMe && socket?.connected)) && user.statusVisible !== false;

  return (
    <Card className="overflow-hidden p-0 bg-gradient-to-r from-sky-500 via-blue-500 to-blue-600">
      <div className="h-24 sm:h-32" />
      <CardContent className="px-4 pb-5 flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 -mt-10 sm:-mt-14">
        <div className="relative shrink-0">
          <UserAvatar
            type="profile"
            name={user.displayName}
            avatarUrl={user.avatarUrl ?? undefined}
            className="ring-4 ring-white shadow-lg"
          />
          <AvatarUploader />
        </div>

        <div className="text-center sm:text-left flex-1 min-w-0 pb-1">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-white truncate">
            {user.displayName}
          </h1>
          <p className="text-white/70 text-xs sm:text-sm mt-1 max-w-lg line-clamp-2">
            {bio}
          </p>
        </div>

        <Badge
          className={cn(
            "flex items-center gap-1 capitalize shrink-0 self-center sm:self-end mb-1",
            isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
          )}
        >
          <div
            className={cn(
              "size-2 rounded-full",
              isOnline ? "bg-green-500 animate-pulse" : "bg-slate-500"
            )}
          />
          {isOnline ? "Trực tuyến" : "Ngoại tuyến"}
        </Badge>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
