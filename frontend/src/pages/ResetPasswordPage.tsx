import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/useThemeStore";
import { authService } from "@/services/authService";

const schema = z
  .object({
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const ResetPasswordPage = () => {
  const { isDark } = useThemeStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      toast.error("Link không hợp lệ hoặc đã hết hạn!");
      return;
    }
    try {
      await authService.resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Token không hợp lệ hoặc đã hết hạn!";
      toast.error(msg);
    }
  };

  // Không có token trong URL
  if (!token) {
    return (
      <div className="auth-page-bg min-h-screen flex items-center justify-center p-4">
        <div
          className={cn(
            "rounded-2xl shadow-xl p-8 border text-center max-w-[420px] w-full",
            isDark ? "bg-slate-900/80 border-blue-900/50" : "bg-white/90 border-white"
          )}
        >
          <h1 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-800")}>
            Link không hợp lệ
          </h1>
          <p className={cn("text-sm mb-4", isDark ? "text-slate-400" : "text-slate-500")}>
            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
          <Link to="/forgot-password" className="text-sky-500 hover:text-sky-400 text-sm font-medium">
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    );
  }

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
          {success ? (
            // ─── Success state ──────────────────────────────────────────
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="size-16 text-green-500" />
              </div>
              <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-800")}>
                Đặt lại mật khẩu thành công!
              </h1>
              <p className={cn("text-sm mb-2", isDark ? "text-slate-400" : "text-slate-500")}>
                Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng đến trang đăng nhập...
              </p>
              <div className="mt-4 h-1 bg-sky-200 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full animate-[progress_3s_linear]" />
              </div>
            </div>
          ) : (
            // ─── Form state ─────────────────────────────────────────────
            <>
              <div className="mb-6">
                <h1 className={cn("text-2xl sm:text-3xl font-bold mb-1", isDark ? "text-white" : "text-slate-800")}>
                  Đặt lại mật khẩu
                </h1>
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                  Nhập mật khẩu mới cho tài khoản của bạn.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* New password */}
                <div>
                  <div className="relative">
                    <Lock
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 size-4",
                        isDark ? "text-slate-500" : "text-slate-400"
                      )}
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      className={cn(
                        "h-11 pl-10 pr-11 rounded-xl border transition-colors",
                        isDark
                          ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
                          : "bg-sky-50/50 border-sky-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        errors.password && "border-red-400"
                      )}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 transition-colors",
                        isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1 ml-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <div className="relative">
                    <Lock
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 size-4",
                        isDark ? "text-slate-500" : "text-slate-400"
                      )}
                    />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Xác nhận mật khẩu mới"
                      className={cn(
                        "h-11 pl-10 pr-11 rounded-xl border transition-colors",
                        isDark
                          ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
                          : "bg-sky-50/50 border-sky-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        errors.confirmPassword && "border-red-400"
                      )}
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 transition-colors",
                        isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1 ml-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-60"
                >
                  {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
                </Button>

                <p className={cn("text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                  <Link to="/signin" className="text-sky-500 hover:text-sky-400 font-medium transition-colors">
                    ← Quay lại đăng nhập
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
