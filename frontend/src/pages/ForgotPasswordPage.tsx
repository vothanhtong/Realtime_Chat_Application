import { useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/useThemeStore";
import { authService } from "@/services/authService";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});
type FormValues = z.infer<typeof schema>;

const ForgotPasswordPage = () => {
  const { isDark } = useThemeStore();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại!");
    }
  };

  return (
    <div className="auth-page-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div
          className={cn(
            "rounded-2xl shadow-xl p-6 sm:p-8 border transition-colors duration-200",
            isDark
              ? "bg-slate-900/80 backdrop-blur-md border-blue-900/50"
              : "bg-white/90 backdrop-blur-sm border-white shadow-gray-200"
          )}
        >
          {sent ? (
            // ─── Success state ───────────────────────────────────────────
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="size-16 text-green-500" />
              </div>
              <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-800")}>
                Kiểm tra email của bạn!
              </h1>
              <p className={cn("text-sm mb-6", isDark ? "text-slate-400" : "text-slate-500")}>
                Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút. Vui lòng kiểm tra cả hộp thư rác.
              </p>
              <Link
                to="/signin"
                className="text-sky-500 hover:text-sky-400 text-sm font-medium transition-colors"
              >
                ← Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            // ─── Form state ──────────────────────────────────────────────
            <>
              <div className="mb-6">
                <Link
                  to="/signin"
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm mb-4 transition-colors",
                    isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ArrowLeft className="size-4" />
                  Quay lại đăng nhập
                </Link>
                <h1 className={cn("text-2xl sm:text-3xl font-bold mb-1", isDark ? "text-white" : "text-slate-800")}>
                  Quên mật khẩu?
                </h1>
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                  Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 size-4",
                        isDark ? "text-slate-500" : "text-slate-400"
                      )}
                    />
                    <Input
                      type="email"
                      placeholder="Email của bạn"
                      autoComplete="email"
                      className={cn(
                        "h-11 pl-10 rounded-xl border transition-colors",
                        isDark
                          ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
                          : "bg-sky-50/50 border-sky-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        errors.email && "border-red-400"
                      )}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-60"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
