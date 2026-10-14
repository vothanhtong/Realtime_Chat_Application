import dotenv from "dotenv";

dotenv.config();

// Module này PHẢI được import đầu tiên trong server.js.
// ESM hoist toàn bộ import trước khi chạy body của server.js,
// nên dotenv.config() đặt ngay trong server.js sẽ chạy SAU body
// của các module khác (socket/index.js, constants.js, ...) —
// khiến process.env.CLIENT_URL... bị undefined lúc module load.
