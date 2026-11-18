import { BrowserRouter, Route, Routes } from "react-router";
import SignInPage from "./pages/SignInPage";
import ChatAppPage from "./pages/ChatAppPage";
import { Toaster } from "sonner";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useThemeStore } from "./stores/useThemeStore";
import { useEffect } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { useChatStore } from "./stores/useChatStore";
import { connectSocket, disconnectSocket } from "./realtime/socketClient";
import { queryClient } from "./lib/queryClient";
import { clearPersistedSession } from "./lib/session";

function App() {
  const isDark = useThemeStore((s) => s.isDark);
  const setTheme = useThemeStore((s) => s.setTheme);
  // Chỉ phụ thuộc vào việc CÓ token hay không — không phụ thuộc giá trị token.
  // Refresh token đổi chuỗi token nhưng giữ nguyên boolean này → socket không
  // bị huỷ/tạo lại (socket tự đọc token mới qua auth callback khi reconnect).
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);

  useEffect(() => {
    setTheme(isDark);
  }, [isDark, setTheme]);

  // Vòng đời phiên: nơi DUY NHẤT điều phối giữa các store/cache — thay cho các
  // lời gọi chéo store→store trước đây (useAuthStore.clearState → useChatStore.reset...).
  useEffect(() => {
    if (!isAuthenticated) return;

    connectSocket();
    // Phiên kết thúc (logout, refresh bị từ chối, 401 ở /users/me) hoặc App unmount:
    // dọn mọi dữ liệu thuộc phiên để tài khoản kế tiếp không thấy dữ liệu cũ.
    return () => {
      disconnectSocket();
      queryClient.clear();
      useChatStore.getState().reset();
      // Chỉ xoá key của phiên — giữ cài đặt theme
      clearPersistedSession();
    };
  }, [isAuthenticated]);

  return (
    <>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={<ChatAppPage />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
