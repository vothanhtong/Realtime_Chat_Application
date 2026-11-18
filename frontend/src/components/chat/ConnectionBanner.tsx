import { useEffect, useRef, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useSocketStore } from "@/stores/useSocketStore";
import { reconnectNow } from "@/realtime/socketClient";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { cn } from "@/lib/utils";

// Không hiện banner cho những lần chớp mạng ngắn (< 1.5s)
const SHOW_AFTER_MS = 1500;

/**
 * Banner ở đầu khung chat khi realtime không hoạt động — rõ ràng hơn chấm
 * trạng thái nhỏ ở sidebar. Tự ẩn khi kết nối lại; có nút "Kết nối lại ngay".
 */
const ConnectionBanner = () => {
  const status = useSocketStore((s) => s.status);
  const isDown = status !== "connected";
  const visible = useDelayedFlag(isDown, SHOW_AFTER_MS);

  // Đã từng kết nối thành công trong phiên này? → "Mất kết nối" thay vì "Đang kết nối"
  const everConnected = useSocketStore((s) => s.hasEverConnected);

  // Hiện thông báo "đã kết nối lại" ngắn sau khi khôi phục
  const [justRecovered, setJustRecovered] = useState(false);
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      return;
    }
    if (status === "connected" && wasVisible.current) {
      wasVisible.current = false;
      setJustRecovered(true);
      const timer = setTimeout(() => setJustRecovered(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, status]);

  if (justRecovered && !visible) {
    return (
      <div role="status" className="px-4 py-1.5 text-xs text-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        Đã kết nối lại
      </div>
    );
  }

  if (!visible) return null;

  const reconnecting = status === "connecting";
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm",
        "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-b border-amber-500/30"
      )}
    >
      {reconnecting ? <Loader2 className="size-4 animate-spin shrink-0" /> : <WifiOff className="size-4 shrink-0" />}
      <span>
        {everConnected
          ? "Mất kết nối realtime — tin nhắn mới có thể chưa hiển thị."
          : "Đang kết nối tới máy chủ (lần đầu có thể mất 30–60 giây)…"}
      </span>
      {!reconnecting && (
        <button
          type="button"
          onClick={reconnectNow}
          className="underline underline-offset-2 font-medium hover:opacity-80 shrink-0"
        >
          Kết nối lại ngay
        </button>
      )}
    </div>
  );
};

export default ConnectionBanner;
