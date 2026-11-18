import type { ReactNode } from "react";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared Loading / Empty / Error states so every list behaves the same way.
 */

// Render free tier ngủ sau ~15 phút idle; request đầu có thể mất 30-60s.
const SLOW_HINT_DELAY_MS = 3000;

/** Shown after a few seconds of loading: explains the cold start */
export const SlowServerHint = ({ active = true, className }: { active?: boolean; className?: string }) => {
  const show = useDelayedFlag(active, SLOW_HINT_DELAY_MS);
  if (!show) return null;
  return (
    <p className={cn("text-xs text-muted-foreground text-center max-w-xs mx-auto", className)}>
      Máy chủ đang khởi động — lần tải đầu tiên có thể mất 30–60 giây. Vui lòng chờ…
    </p>
  );
};

export const LoadingState = ({
  label = "Đang tải…",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "flex flex-col items-center justify-center gap-2 text-muted-foreground",
      compact ? "py-4" : "py-8",
      className
    )}
  >
    <Loader2 className={cn("animate-spin", compact ? "size-4" : "size-6")} />
    <span className="text-sm">{label}</span>
    <SlowServerHint />
  </div>
);

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col items-center justify-center gap-2 py-8 text-center px-4", className)}>
    <div className="text-muted-foreground/60">{icon ?? <Inbox className="size-8" />}</div>
    <p className="text-sm font-medium text-muted-foreground">{title}</p>
    {description && <p className="text-xs text-muted-foreground/80 max-w-xs">{description}</p>}
    {action}
  </div>
);

export const ErrorState = ({
  message = "Không tải được dữ liệu.",
  onRetry,
  retrying = false,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) => (
  <div
    role="alert"
    className={cn("flex flex-col items-center justify-center gap-3 py-8 text-center px-4", className)}
  >
    <AlertCircle className="size-7 text-destructive/80" />
    <p className="text-sm text-muted-foreground">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={cn("size-4 mr-2", retrying && "animate-spin")} />
        {retrying ? "Đang thử lại…" : "Thử lại"}
      </Button>
    )}
  </div>
);
