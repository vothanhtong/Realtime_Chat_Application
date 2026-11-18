import { Shield, Bell, ShieldBan, Ghost } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUpdateStatusVisibility } from "@/hooks/useProfile";

const ComingSoonBadge = ({ className }: { className?: string }) => (
  <Badge variant="outline" className={cn("text-[10px] font-medium uppercase tracking-wide", className)}>
    Sắp ra mắt
  </Badge>
);

const ComingSoonButton = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <Button
    variant="outline"
    className="w-full justify-start glass-light border-border/30"
    disabled
    aria-disabled="true"
    title="Tính năng sắp ra mắt"
  >
    {icon}
    {label}
    <ComingSoonBadge className="ml-auto" />
  </Button>
);

const PrivacySettings = () => {
  const user = useAuthStore((s) => s.user);
  const { mutate: updateStatusVisibility, isPending } = useUpdateStatusVisibility();

  return (
    <Card className="glass-strong border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Quyền riêng tư & Bảo mật
        </CardTitle>
        <CardDescription>
          Quản lý cài đặt quyền riêng tư và bảo mật của bạn
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 glass-light rounded-xl border border-border/30 hover:bg-primary/5 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Ghost className="size-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold cursor-pointer">
                Chế độ ẩn danh
              </Label>
              <p className="text-xs text-muted-foreground">
                Ẩn trạng thái trực tuyến của bạn với người khác.
              </p>
            </div>
          </div>
          <Switch
            checked={!user?.statusVisible}
            disabled={isPending}
            onCheckedChange={(checked) => updateStatusVisibility(!checked)}
          />
        </div>

        {/* Các tính năng chưa có backend: disable + nhãn "Sắp ra mắt" để không gây hiểu nhầm */}
        <div className="space-y-4">
          <ComingSoonButton icon={<Shield className="h-4 w-4 mr-2" />} label="Đổi mật khẩu" />
          <ComingSoonButton icon={<Bell className="h-4 w-4 mr-2" />} label="Cài đặt thông báo" />
          <ComingSoonButton icon={<ShieldBan className="size-4 mr-2" />} label="Chặn & Báo cáo" />
        </div>

        <div className="pt-4 border-t border-border/30">
          <h4 className="font-medium mb-3 text-destructive">Khu vực nguy hiểm</h4>
          <Button
            variant="destructive"
            className="w-full"
            disabled
            aria-disabled="true"
            title="Tính năng sắp ra mắt"
          >
            Xoá tài khoản
            <ComingSoonBadge className="ml-2 border-white/40 text-white" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivacySettings;
