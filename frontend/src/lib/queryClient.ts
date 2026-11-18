import { QueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "./axios";

/**
 * Single QueryClient for the app. Exported (not just provided via context) so
 * non-React code — socket handlers in src/realtime — can update the cache with
 * setQueryData.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 401 đã được axios interceptor xử lý (refresh / đăng xuất) — retry vô ích
      retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
