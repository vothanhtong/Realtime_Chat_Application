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
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5001";
const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === "true";
const GITHUB_ENABLED = import.meta.env.VITE_GITHUB_OAUTH_ENABLED === "true";

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

  const handleGoogleLogin = () => {
    if (!GOOGLE_ENABLED) {
      toast.error("Google OAuth chưa được cấu hình. Vui lòng điền GOOGLE_CLIENT_ID vào Backend/.env");
      return;
    }
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  const handleGithubLogin = () => {
    if (!GITHUB_ENABLED) {
      toast.error("GitHub OAuth chưa được cấu hình. Vui lòng điền GITHUB_CLIENT_ID vào Backend/.env");
      return;
    }
    window.location.href = `${BACKEND_URL}/api/auth/github`;
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
              Welcome Back
            </h1>
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Sign in to your account
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
                    ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-violet-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400",
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
                className="size-4 rounded accent-violet-500"
                {...register("rememberMe")}
              />
              <span className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                Remember me
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-violet-500 text-sm hover:text-violet-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600 transition-all duration-200 disabled:opacity-60"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Sign In"}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={cn("flex-1 h-px", isDark ? "bg-slate-700" : "bg-slate-200")} />
            <span className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
              or continue with
            </span>
            <div className={cn("flex-1 h-px", isDark ? "bg-slate-700" : "bg-slate-200")} />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={cn(
                "flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all",
                isDark
                  ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
              )}
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleGithubLogin}
              className={cn(
                "flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all",
                isDark
                  ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
              )}
            >
              <svg className={cn("size-4 shrink-0", isDark ? "fill-white" : "fill-slate-700")} viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Sign up link */}
          <p className={cn("text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            Don't have an account?{" "}
            <Link to="/signup" className="text-violet-500 hover:text-violet-400 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
