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

const signUpSchema = z.object({
  firstName: z.string().min(1, "Vui lòng nhập tên"),
  lastName: z.string().min(1, "Vui lòng nhập họ"),
  username: z.string().min(3, "Username phải có ít nhất 3 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpFormValues) => {
    try {
      await signUp(data.username, data.password, data.email, data.firstName, data.lastName);
      navigate("/signin");
    } catch {
      // lỗi đã được handle trong store
    }
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      "h-11 rounded-xl border transition-colors",
      isDark
        ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-sky-500"
        : "bg-sky-50/50 border-sky-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400",
      "focus-visible:ring-0 focus-visible:ring-offset-0",
      hasError && "border-red-400"
    );

  return (
    <div className={cn("w-full relative", className)} {...props}>
      {/* Card */}
      <div className={cn(
        "rounded-2xl shadow-2xl p-6 sm:p-8 border transition-colors duration-200",
        isDark
          ? "bg-slate-900/80 backdrop-blur-md border-blue-900/50"
          : "bg-white border-white/80"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className={cn(
              "text-2xl sm:text-3xl font-bold mb-1",
              isDark ? "text-white" : "text-slate-800"
            )}>
              Tạo tài khoản
            </h1>
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Tham gia ngay, hoàn toàn miễn phí!
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Họ & Tên */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="Họ"
                className={inputClass(!!errors.lastName)}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <Input
                placeholder="Tên"
                className={inputClass(!!errors.firstName)}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.firstName.message}</p>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <Input
              placeholder="Username"
              autoComplete="username"
              className={inputClass(!!errors.username)}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1 ml-1">{errors.username.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              className={inputClass(!!errors.email)}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1 ml-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                autoComplete="new-password"
                className={cn(inputClass(!!errors.password), "pr-11")}
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

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Xác nhận mật khẩu"
                autoComplete="new-password"
                className={cn(inputClass(!!errors.confirmPassword), "pr-11")}
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

          {/* Sign Up button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-60 mt-1"
          >
            {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>

          {/* OAuth Buttons (Firebase) */}
          <OAuthButtons mode="signup" />

          {/* Sign in link */}
          <p className={cn("text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            Đã có tài khoản?{" "}
            <Link to="/signin" className="text-sky-500 hover:text-sky-400 font-medium transition-colors">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
