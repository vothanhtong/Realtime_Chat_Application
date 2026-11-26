#!/usr/bin/env bash
# Chạy toàn bộ app trên máy (localhost) — không cần Render / Vercel / MongoDB Atlas / Cloudinary.
#   ./run-local.sh            → Mongo local + lưu ảnh ra Backend/uploads
#   USE_ENV_DB=1 ./run-local.sh → vẫn dùng MONGODB_CONNECTIONSTRING trong Backend/.env (vd. Atlas)
#
# Biến đặt ở đây GHI ĐÈ giá trị trong Backend/.env (dotenv không override biến đã có),
# nên file .env của bạn giữ nguyên, muốn deploy lại lúc nào cũng được.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Ctrl+C / thoát → dừng mọi tiến trình con (backend, frontend, và mongod nếu script bật)
cleanup() { trap - INT TERM EXIT; kill 0 2>/dev/null || true; }
trap cleanup INT TERM EXIT

# ── MongoDB local ──────────────────────────────────────────────────────────────
# Nếu MongoDB đã chạy sẵn (tự bật / brew services) thì dùng luôn. Nếu chưa, script
# chạy mongod TRỰC TIẾP như một tiến trình con: không qua launchd/brew services,
# không đăng ký tự bật khi mở máy, và tự tắt khi bạn dừng script.
if [[ "${USE_ENV_DB:-0}" != "1" ]]; then
  export MONGODB_CONNECTIONSTRING="mongodb://127.0.0.1:27017/chat_app"
  if ! nc -z 127.0.0.1 27017 2>/dev/null; then
    # Tên formula có thể kèm phiên bản (vd. mongodb-community@7.0) — lấy bản đang cài
    MONGO_FORMULA="$(brew list --formula 2>/dev/null | grep -E '^mongodb-community(@.*)?$' | sort | tail -1 || true)"
    MONGOD="${MONGO_FORMULA:+$(brew --prefix "$MONGO_FORMULA")/bin/mongod}"
    if [[ -z "$MONGOD" || ! -x "$MONGOD" ]]; then
      MONGOD="$(command -v mongod || true)"
    fi
    if [[ -z "$MONGOD" ]]; then
      echo "❌ Chưa cài MongoDB. Cài: brew tap mongodb/brew && brew install mongodb-community"
      echo "   (hoặc chạy USE_ENV_DB=1 ./run-local.sh để dùng DB trong Backend/.env)"; exit 1
    fi
    MONGO_CONF="$(brew --prefix 2>/dev/null || echo /opt/homebrew)/etc/mongod.conf"
    MONGO_LOG_HINT="xem log trong mongod.conf"
    if [[ -f "$MONGO_CONF" ]]; then
      MONGO_ARGS=(--config "$MONGO_CONF")
    else
      DATA_DIR="$ROOT/.mongo-data"; mkdir -p "$DATA_DIR"
      MONGO_ARGS=(--dbpath "$DATA_DIR" --bind_ip 127.0.0.1 --logpath "$DATA_DIR/mongod.log")
      MONGO_LOG_HINT="xem $DATA_DIR/mongod.log"
    fi
    echo "▶ MongoDB chưa chạy — khởi động $MONGOD (tự tắt khi dừng script)..."
    "$MONGOD" "${MONGO_ARGS[@]}" >/dev/null 2>&1 &
    MONGO_PID=$!
    for _ in {1..40}; do nc -z 127.0.0.1 27017 2>/dev/null && break; sleep 0.5; done
    if ! nc -z 127.0.0.1 27017 2>/dev/null; then
      kill -0 "$MONGO_PID" 2>/dev/null || echo "❌ mongod đã thoát ngay khi khởi động"
      echo "❌ MongoDB không lắng nghe cổng 27017 — $MONGO_LOG_HINT"; exit 1
    fi
  fi
fi

# ── Backend chạy chế độ dev trên localhost ────────────────────────────────────
export NODE_ENV=development
export PORT=5001
export SERVER_URL="http://localhost:5001"
export CLIENT_URL="http://localhost:5173,http://127.0.0.1:5173"
# Để trống Cloudinary → ảnh lưu vào Backend/uploads (không tốn quota cloud)
export CLOUDINARY_CLOUD_NAME="" CLOUDINARY_API_KEY="" CLOUDINARY_API_SECRET=""

echo "▶ Backend  → http://localhost:5001  (Swagger: http://localhost:5001/api-docs)"
(cd "$ROOT/Backend" && npm run dev) &

echo "▶ Frontend → http://localhost:5173"
(cd "$ROOT/frontend" && npm run dev) &

wait
