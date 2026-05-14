import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAccessToken, fetchMe } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Đăng nhập thất bại. Vui lòng thử lại!");
      navigate("/signin");
      return;
    }

    if (token) {
      setAccessToken(token);
      fetchMe().then(() => {
        toast.success("Đăng nhập thành công!");
        navigate("/");
      }).catch(() => {
        toast.error("Có lỗi xảy ra. Vui lòng thử lại!");
        navigate("/signin");
      });
    } else {
      navigate("/signin");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-purple">
      <div className="text-center text-white">
        <div className="size-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">Đang đăng nhập...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
