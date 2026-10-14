import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = () => {
  const { accessToken, user, loading, refresh, fetchMe } = useAuthStore();
  const [starting, setStarting] = useState(true);
  // StrictMode (dev) chạy effect 2 lần — guard bằng ref để refresh()/fetchMe()
  // chỉ được gọi một lần, tránh gửi 2 request /auth/refresh y hệt nhau khi load
  const initialized = useRef(false);

  const init = async () => {
    // Nếu chưa có accessToken, thử refresh âm thầm (silent)
    if (!accessToken) {
      await refresh(true);
    }

    const currentAccessToken = useAuthStore.getState().accessToken;
    if (currentAccessToken && !user) {
      await fetchMe();
    }

    setStarting(false);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải trang...
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

  return <Outlet></Outlet>;
};

export default ProtectedRoute;
