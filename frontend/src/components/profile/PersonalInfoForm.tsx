import { Heart, Loader2 } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/user";
import { useUserStore } from "@/stores/useUserStore";
import { useEffect, useState } from "react";

type Props = { userInfo: User | null };

const PersonalInfoForm = ({ userInfo }: Props) => {
  const { updateProfile } = useUserStore();
  const [loading, setLoading] = useState(false);

  // State cho các field có thể edit
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  // Sync khi userInfo thay đổi
  useEffect(() => {
    if (userInfo) {
      setDisplayName(userInfo.displayName ?? "");
      setBio(userInfo.bio ?? "");
      setPhone(userInfo.phone ?? "");
    }
  }, [userInfo]);

  if (!userInfo) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile({ displayName, bio, phone });
    } catch {
      // lỗi đã toast trong store
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-strong border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="size-5 text-primary" />
          Thông tin cá nhân
        </CardTitle>
        <CardDescription>
          Cập nhật chi tiết cá nhân và thông tin hồ sơ của bạn
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tên hiển thị — có thể edit */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Tên hiển thị</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass-light border-border/30"
              placeholder="Nhập tên hiển thị..."
            />
          </div>

          {/* Username — chỉ đọc */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-1">
              Tên người dùng
              <span className="text-xs text-muted-foreground">(không thể thay đổi)</span>
            </Label>
            <Input
              id="username"
              value={userInfo.username}
              readOnly
              disabled
              className="glass-light border-border/30 opacity-60 cursor-not-allowed"
            />
          </div>

          {/* Email — chỉ đọc */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              Email
              <span className="text-xs text-muted-foreground">(không thể thay đổi)</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={userInfo.email}
              readOnly
              disabled
              className="glass-light border-border/30 opacity-60 cursor-not-allowed"
            />
          </div>

          {/* Số điện thoại — có thể edit */}
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="glass-light border-border/30"
              placeholder="Nhập số điện thoại..."
            />
          </div>
        </div>

        {/* Bio — có thể edit */}
        <div className="space-y-2">
          <Label htmlFor="bio">
            Giới thiệu
            <span className="text-xs text-muted-foreground ml-1">
              ({bio.length}/500)
            </span>
          </Label>
          <Textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            className="glass-light border-border/30 resize-none"
            placeholder="Viết vài dòng giới thiệu về bản thân..."
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full md:w-auto bg-gradient-primary hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Đang lưu...
            </>
          ) : (
            "Lưu thay đổi"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PersonalInfoForm;
