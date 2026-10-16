import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Node 25+ resolve "localhost" → ::1, khiến Vite chỉ bind IPv6;
  // trình duyệt đi 127.0.0.1 sẽ bị từ chối (ERR_ABORTED). host: true
  // buộc dual-stack (cả IPv4 lẫn IPv6).
  server: { host: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
