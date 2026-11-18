import { useAuthStore } from "@/stores/useAuthStore";
import { fetchMe, restoreSession } from "@/lib/session";
import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { LoadingState } from "../common/QueryStates";

const ProtectedRoute = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [starting, setStarting] = useState(true);
  const [retrying, setRetrying] = useState(false);
  // StrictMode (dev) chạy effect 2 lần — guard bằng ref để chỉ bootstrap một lần,
  // tránh gửi 2 request /auth/refresh y hệt nhau khi load
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      // Chưa có accessToken trong bộ nhớ → thử refresh-token cookie (im lặng)
      if (!useAuthStore.getState().accessToken) await restoreSession();

      const { accessToken: token, user: current } = useAuthStore.getState();
      if (token && !current) await fetchMe();

      setStarting(false);
    };
    void init();
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    await fetchMe();
    setRetrying(false);
  };

  if (starting) {
    return (
      // Spinner + gợi ý "máy chủ đang khởi động" nếu refresh/fetchMe chậm (cold start)
      <div className="flex h-screen items-center justify-center">
        <LoadingState label="Đang tải trang…" />
      </div>
    );
  }

  if (!accessToken) {
    return (
      <Navigate
        to="/signin"
        replace
      />
    );
  }

  // Có token nhưng chưa lấy được user (mất mạng / server đang khởi động):
  // fetchMe không tự đăng xuất trong trường hợp này → cho phép thử lại.
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center px-4">
        <p>Không thể kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
        >
          {retrying ? "Đang thử lại..." : "Thử lại"}
        </button>
      </div>
    );
  }

  return <Outlet></Outlet>;
};

export default ProtectedRoute;
