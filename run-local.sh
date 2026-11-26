#!/usr/bin/env bash
# Chạy toàn bộ app trên máy (localhost) — không cần Render / Vercel / MongoDB Atlas / Cloudinary.
#   ./run-local.sh            → Mongo local + lưu ảnh ra Backend/uploads
#   USE_ENV_DB=1 ./run-local.sh → vẫn dùng MONGODB_CONNECTIONSTRING trong Backend/.env (vd. Atlas)
#
# Biến đặt ở đây GHI ĐÈ giá trị trong Backend/.env (dotenv không override biến đã có),
# nên file .env của bạn giữ nguyên, muốn deploy lại lúc nào cũng được.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── MongoDB local ──────────────────────────────────────────────────────────────
if [[ "${USE_ENV_DB:-0}" != "1" ]]; then
  export MONGODB_CONNECTIONSTRING="mongodb://127.0.0.1:27017/chat_app"
  if ! nc -z 127.0.0.1 27017 2>/dev/null; then
    echo "▶ MongoDB chưa chạy — khởi động bằng brew services..."
    brew services start mongodb-community >/dev/null 2>&1 || {
      echo "❌ Không khởi động được MongoDB. Cài: brew tap mongodb/brew && brew install mongodb-community"; exit 1; }
    for _ in {1..20}; do nc -z 127.0.0.1 27017 2>/dev/null && break; sleep 0.5; done
  fi
fi

# ── Backend chạy chế độ dev trên localhost ────────────────────────────────────
export NODE_ENV=development
export PORT=5001
export SERVER_URL="http://localhost:5001"
export CLIENT_URL="http://localhost:5173,http://127.0.0.1:5173"
# Để trống Cloudinary → ảnh lưu vào Backend/uploads (không tốn quota cloud)
export CLOUDINARY_CLOUD_NAME="" CLOUDINARY_API_KEY="" CLOUDINARY_API_SECRET=""

cleanup() { trap - INT TERM EXIT; kill 0 2>/dev/null || true; }
trap cleanup INT TERM EXIT

echo "▶ Backend  → http://localhost:5001  (Swagger: http://localhost:5001/api-docs)"
(cd "$ROOT/Backend" && npm run dev) &

echo "▶ Frontend → http://localhost:5173"
(cd "$ROOT/frontend" && npm run dev) &

wait
