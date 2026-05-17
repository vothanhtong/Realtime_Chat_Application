import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate, Link } from "react-router";
import { useState } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";
import OAuthButtons from "./OAuthButtons";

const signInSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập email hoặc username"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  rememberMe: z.boolean().optional(),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SigninForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signIn } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: SignInFormValues) => {
    try {
      await signIn(data.username, data.password);
      navigate("/");
    } catch {
      // lỗi đã được handle trong store
    }
  };

  return (
    <div className={cn("w-full relative", className)} {...props}>
      {/* Card */}
      <div className={cn(
        "rounded-2xl shadow-xl p-6 sm:p-8 border transition-colors duration-200",
        isDark
          ? "bg-slate-900/80 backdrop-blur-md border-blue-900/50"
          : "bg-white/90 backdrop-blur-sm border-white shadow-gray-200"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={cn(
              "text-2xl sm:text-3xl font-bold mb-1",
              isDark ? "text-white" : "text-slate-800"
            )}>
              Chào mừng trở lại
            </h1>
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Đăng nhập vào tài khoản của bạn
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              "p-2.5 rounded-xl border transition-all duration-200 shrink-0",
              isDark
                ? "bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
            )}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email / Username */}
          <div>
            <Input
              type="text"
              placeholder="Email hoặc Username"
              autoComplete="email"
              className={cn(
                  "h-11 rounded-xl border transition-colors",
                  isDark
                    ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
                    : "bg-sky-50/50 border-sky-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  errors.username && "border-red-400"
                )}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1 ml-1">{errors.username.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                className={cn(
                  "h-11 rounded-xl border pr-11 transition-colors",
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

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="size-4 rounded accent-sky-500"
                {...register("rememberMe")}
              />
              <span className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                Ghi nhớ đăng nhập
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sky-500 text-sm hover:text-sky-400 transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* Sign In button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-60"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>

          {/* OAuth Buttons (Firebase) */}
          <OAuthButtons mode="signin" />

          {/* Sign up link */}
          <p className={cn("text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            Chưa có tài khoản?{" "}
            <Link to="/signup" className="text-sky-500 hover:text-sky-400 font-medium transition-colors">
              Đăng ký
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
