import { defineConfig } from "vitest/config";
import os from "os";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Set BEFORE any src module is imported (constants.js reads NODE_ENV at load time)
    env: {
      NODE_ENV: "test",
      ACCESS_TOKEN_SECRET: "test-access-token-secret",
      CLIENT_URL: "http://localhost:5173",
      SERVER_URL: "http://localhost:5001",
      // Never touch the real Cloudinary account / real uploads folder from tests
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      UPLOADS_DIR: path.join(os.tmpdir(), `chat-app-test-uploads-${process.pid}`),
    },
    // Each file starts its own in-memory MongoDB + HTTP/Socket server.
    // Run files one at a time: presence/emitter are process-level singletons.
    fileParallelism: false,
    pool: "forks",
    testTimeout: 30_000,
    // First run may download the MongoDB binary for mongodb-memory-server
    hookTimeout: 180_000,
  },
});
