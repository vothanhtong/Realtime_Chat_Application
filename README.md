# 💬 Realtime Chat Application

Ứng dụng chat thời gian thực (1-1 và nhóm). Frontend dùng **React + TypeScript**, backend dùng **Express 5 + MongoDB + Socket.IO**.

![React](https://img.shields.io/badge/React-TypeScript-blue?logo=react)
![Node](https://img.shields.io/badge/Express_5-Node.js-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-darkgreen?logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black?logo=socketdotio)
![CI](https://github.com/vothanhtong/Realtime_Chat_Application/actions/workflows/ci.yml/badge.svg)

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Kiến trúc](#kiến-trúc)
- [Chạy trên localhost](#chạy-trên-localhost)
- [Biến môi trường](#biến-môi-trường)
- [API](#api)
- [Sự kiện Socket.IO](#sự-kiện-socketio)
- [Bảo mật](#bảo-mật)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Kiểm thử](#kiểm-thử)
- [Triển khai](#triển-khai)
- [Giới hạn hiện tại](#giới-hạn-hiện-tại)

---

## Tính năng

| Nhóm | Chức năng |
|---|---|
| **Xác thực** | Đăng ký / đăng nhập bằng username hoặc email, access token (15 phút) + refresh token trong cookie httpOnly (14 ngày), đăng xuất, quên & đặt lại mật khẩu qua email, đăng nhập Google / GitHub (Firebase) |
| **Bạn bè** | Gửi / đồng ý / từ chối / huỷ lời mời, danh sách bạn bè & lời mời, xoá bạn, đặt biệt danh |
| **Tin nhắn** | Chat 1-1 (tự tạo hội thoại ở tin đầu tiên), chat nhóm, gửi ảnh và emoji, xoá tin phía mình, thu hồi tin với mọi người |
| **Hội thoại** | Tạo hội thoại direct / group, danh sách hội thoại kèm tin cuối, phân trang tin nhắn theo cursor (cuộn vô hạn), đánh dấu đã xem, đếm tin chưa đọc |
| **Người dùng** | Xem / cập nhật hồ sơ, tìm theo username hoặc tên hiển thị, upload avatar (tự crop vuông), chế độ ẩn danh (ẩn trạng thái online) |
| **Realtime** | Tin nhắn tức thì, "đang soạn tin", online / offline (hỗ trợ nhiều tab), đã xem, đồng bộ hồ sơ, tự kết nối lại và đồng bộ lại khi mất mạng |

---

## Công nghệ

**Frontend:** React, TypeScript, Vite, TailwindCSS, Radix UI (shadcn/ui), Zustand, TanStack Query, React Hook Form + Zod, Axios, Socket.IO Client, Emoji Mart, Firebase Auth

**Backend:** Node.js, Express 5, MongoDB + Mongoose, Socket.IO, JWT, bcrypt, Multer + Sharp (xử lý ảnh), Cloudinary *(tuỳ chọn)*, Nodemailer, Firebase Admin, Swagger UI

**Kiểm thử & CI:** Vitest, Supertest, mongodb-memory-server, socket.io-client, ESLint, GitHub Actions

---

## Kiến trúc

```text
           REST (Axios)                       Socket.IO
 frontend ─────────────▶ routes → controllers ─┐      ┌─ socket/index.js ◀──── frontend
                                               ▼      ▼
                                          services/  (nghiệp vụ, phân quyền, validate)
                                               │
                          ┌────────────────────┼──────────────────────┐
                          ▼                    ▼                      ▼
                   models/ (MongoDB)   realtime/emitter.js    storage/media (Sharp,
                                       (phát sự kiện tới      Cloudinary hoặc đĩa)
                                        room user / hội thoại)
```

- **REST và socket dùng chung một service.** Ví dụ `messageService.send` vừa phục vụ `POST /api/messages/*` vừa phục vụ `send-message`, nên không đường nào bỏ qua được bước kiểm tra bạn bè / thành viên.
- **Room:** `user:<userId>` gom mọi tab và thiết bị của một user, `conversation:<id>` gom mọi thành viên của hội thoại. Server tự đưa socket vào room khi hội thoại được tạo.
- **Frontend:** dữ liệu từ server nằm trong cache TanStack Query (`lib/chatCache.ts` là nơi duy nhất ghi vào cache). Trạng thái giao diện nằm trong các store Zustand. Socket handler (`realtime/handlers.ts`) và mutation ghi cache theo cùng một cách.

---

## Chạy trên localhost

### Yêu cầu

- Node.js 22 (CI dùng 22.x)
- MongoDB tại `127.0.0.1:27017`. Trên macOS: `brew tap mongodb/brew && brew install mongodb-community`

### Cài đặt

```bash
git clone https://github.com/vothanhtong/Realtime_Chat_Application.git
cd Realtime_Chat_Application

cp Backend/.env.example Backend/.env      # tối thiểu: điền ACCESS_TOKEN_SECRET
cp frontend/.env.example frontend/.env

(cd Backend && npm install)
(cd frontend && npm install)
```

Tạo `ACCESS_TOKEN_SECRET` ngẫu nhiên:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Chạy

```bash
./run-local.sh        # Ctrl+C để dừng cả backend lẫn frontend
```

| Dịch vụ | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:5001/api |
| Swagger | http://localhost:5001/api-docs |
| Health check | http://localhost:5001/api/health |

`run-local.sh` tự bật MongoDB nếu chưa chạy, rồi chạy backend và frontend song song. Script ghi đè một số biến môi trường mà **không sửa file `.env`**:

- dùng DB local `chat_app`
- `CLIENT_URL` là localhost
- tắt Cloudinary, nên ảnh được lưu vào `Backend/uploads`

Muốn dùng DB khai báo trong `.env` (ví dụ MongoDB Atlas) thì chạy `USE_ENV_DB=1 ./run-local.sh`.

Chạy riêng từng phần: `cd Backend && npm run dev` · `cd frontend && npm run dev`.

> Tính năng **quên mật khẩu** cần cấu hình SMTP. Tính năng **đăng nhập Google / GitHub** cần Firebase (xem bên dưới). Mọi tính năng khác chạy được ngay mà không cần dịch vụ ngoài.

---

## Biến môi trường

### `Backend/.env`

Thiếu biến bắt buộc thì server dừng ngay khi khởi động. Xem chú thích chi tiết trong `Backend/.env.example`.

| Biến | Bắt buộc | Mô tả |
|---|:-:|---|
| `MONGODB_CONNECTIONSTRING` | ✅ | Ví dụ `mongodb://127.0.0.1:27017/chat_app` |
| `ACCESS_TOKEN_SECRET` | ✅ | Chuỗi ngẫu nhiên dài để ký JWT |
| `CLIENT_URL` | ✅ | Origin của frontend (CORS + Socket.IO), phân tách bằng dấu phẩy. Origin **đầu tiên** được dùng để tạo link đặt lại mật khẩu |
| `NODE_ENV` | | `production` bật cookie `Secure; SameSite=None`, tắt `/api-docs` và tắt tự nhảy port |
| `PORT`, `SERVER_URL` | | Mặc định `5001` và `http://localhost:5001`. `SERVER_URL` dùng để nhận diện ảnh lưu local |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | | Gửi email quên mật khẩu. Với Gmail, dùng App Password |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | | Để trống thì ảnh lưu trên đĩa |
| `UPLOADS_DIR` | | Thư mục lưu ảnh khi không dùng Cloudinary (mặc định `Backend/uploads`) |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` / `FIREBASE_PROJECT_ID` | | Firebase Admin cho OAuth. Local có thể dùng file `Backend/config/firebase-service-account.json` thay thế |
| `API_DOCS_ENABLED` | | `true` / `false`: bật hoặc tắt Swagger bất kể `NODE_ENV` |

### `frontend/.env`

Mọi biến `VITE_*` đều bị nhúng vào bundle JS công khai, nên **không đặt bí mật ở đây**.

| Biến | Mô tả |
|---|---|
| `VITE_API_URL` | `http://localhost:5001/api` (kết thúc bằng `/api`) |
| `VITE_SOCKET_URL` | `http://localhost:5001` (không có `/api`) |
| `VITE_GOOGLE_OAUTH_ENABLED`, `VITE_GITHUB_OAUTH_ENABLED` | `true` / `false` (mặc định `false`): hiện nút đăng nhập Google / GitHub |
| `VITE_FIREBASE_*` | Cấu hình Firebase web app (công khai theo thiết kế của Firebase) |

> ⚠️ Không commit `.env` và file service account Firebase (`*firebase-adminsdk*.json`, `firebase-service-account*`). Các file này đã có trong `.gitignore`. Khi nén dự án để nộp hoặc gửi cho người khác, nhớ loại chúng ra.

---

## API

Base URL `http://localhost:5001/api` · 🔒 cần header `Authorization: Bearer <accessToken>` · Schema chi tiết xem Swagger tại `/api-docs`.

Mọi lỗi trả về dạng `{ "message": "..." }`. Mã lỗi chung:

- `400`: dữ liệu không hợp lệ
- `401`: chưa đăng nhập hoặc token hết hạn / bị thu hồi
- `403`: không có quyền
- `404`: không tìm thấy
- `409`: bị trùng
- `413`: file quá lớn
- `429`: vượt giới hạn tần suất

### Auth — `/auth`

| Method | Endpoint | Mô tả | Lỗi |
|---|---|---|---|
| POST | `/signup` | Tạo tài khoản `{ username, email, password, firstName, lastName }` | 400 · 409 trùng username / email |
| POST | `/signin` | `{ username, password }` (`username` có thể là email). Trả `accessToken` và set cookie `refreshToken` | 401 sai thông tin |
| POST | `/signout` | Xoá session và cookie | |
| POST | `/refresh` | Cấp access token mới từ cookie | 401 thiếu / hết hạn / không hợp lệ |
| POST | `/forgot-password` | `{ email }`: gửi link đặt lại (hiệu lực 15 phút). Luôn trả cùng một thông báo để không lộ email nào tồn tại | 429 |
| POST | `/reset-password` | `{ token, password }`: đổi mật khẩu và thu hồi mọi phiên cũ | 400 token sai / hết hạn |
| POST | `/oauth/google`, `/oauth/github` | `{ idToken }` (Firebase ID token) | 401 · 409 email chưa xác minh |

### Friends — `/friends` 🔒

| Method | Endpoint | Mô tả | Lỗi |
|---|---|---|---|
| POST | `/requests` | Gửi lời mời `{ to, message? }` | 400 đã là bạn / đã có lời mời · 404 |
| POST | `/requests/:requestId/accept` | Người nhận đồng ý | 403 · 404 |
| POST | `/requests/:requestId/decline` | Người nhận từ chối, hoặc người gửi huỷ | 403 · 404 |
| GET | `/` | Danh sách bạn (kèm `nickname`) | |
| GET | `/requests` | `{ sent, received }` | |
| DELETE | `/:friendId` | Xoá bạn | 404 |
| PATCH | `/:friendId/nickname` | `{ nickname }`: đặt biệt danh (`null` để xoá) | 404 |

### Messages — `/messages` 🔒

| Method | Endpoint | Mô tả | Lỗi |
|---|---|---|---|
| POST | `/direct` | `{ recipientId \| conversationId, content?, imgUrl? }`: tự tạo hội thoại nếu chưa có | 400 · 403 chưa kết bạn |
| POST | `/group` | `{ conversationId, content?, imgUrl? }` | 400 · 403 không phải thành viên |
| DELETE | `/:messageId` | Xoá tin phía mình | 403 · 404 |
| POST | `/:messageId/recall` | Thu hồi với mọi người (chỉ người gửi) | 403 · 404 |

Tin nhắn cần có `content` (tối đa 5000 ký tự) hoặc `imgUrl`. `imgUrl` phải là URL do chính endpoint `/users/uploadImage` trả về. Mỗi tin mới sẽ:

- reset `seenBy`
- tăng `unreadCounts` cho người nhận (cập nhật nguyên tử, không mất lượt đếm khi nhiều tin đến cùng lúc)
- phát `new-message` tới room hội thoại

### Conversations — `/conversations` 🔒

| Method | Endpoint | Mô tả | Lỗi |
|---|---|---|---|
| POST | `/` | `{ type: "direct" \| "group", name?, memberIds }`. Nhóm cần ≥ 2 thành viên ngoài bạn, và tất cả phải là bạn bè | 400 · 403 |
| GET | `/` | Danh sách hội thoại (participants, tin cuối, `unreadCounts`) | |
| GET | `/:conversationId/messages?limit=&cursor=` | Tin nhắn mới nhất trước. `limit` mặc định 50, tối đa 100. Trả `{ messages, nextCursor }` | 400 · 403 |
| PATCH | `/:conversationId/seen` | Đánh dấu đã xem | 400 |
| DELETE | `/:conversationId` | Xoá hội thoại và toàn bộ tin. Với nhóm, chỉ người tạo nhóm được xoá | 403 |

### Users — `/users` 🔒

| Method | Endpoint | Mô tả | Lỗi |
|---|---|---|---|
| GET | `/me` | Thông tin người dùng hiện tại | |
| GET | `/search?username=` | Tìm theo username (khớp đúng) hoặc tên hiển thị (khớp một phần) | 400 · 404 |
| PATCH | `/profile` | `{ displayName?, bio?, phone? }` | 400 |
| POST | `/uploadAvatar` | multipart `file`: JPEG / PNG / WebP / GIF ≤ 2 MB, crop vuông 200×200 | 400 · 413 |
| POST | `/uploadImage` | multipart `file`: ảnh ≤ 5 MB, rộng tối đa 1280px. Trả `{ url, width, height }` | 400 · 413 |
| PATCH | `/status-visible` | `{ statusVisible: boolean }`: bật / tắt chế độ ẩn danh | 400 |

`GET /api/health`: health check, không cần đăng nhập (trả 503 nếu mất kết nối DB).

---

## Sự kiện Socket.IO

Client kết nối tới `VITE_SOCKET_URL` với `auth: { token: <accessToken> }`. Token hết hạn thì client tự refresh rồi kết nối lại. Server bật *connection state recovery*: mất mạng dưới 2 phút thì kết nối lại sẽ không lỡ sự kiện nào.

**Client → server**

| Sự kiện | Payload | Ý nghĩa |
|---|---|---|
| `send-message` | `{ type, conversationId?, recipientId?, content, imgUrl? }` + ack | Gửi tin. Ack trả `{ success, message?, error? }`. Giới hạn 20 tin / 10 giây |
| `typing`, `stop-typing` | `conversationId` | Đang soạn tin / ngừng soạn |
| `join-conversation` | `conversationId` | Vào phòng (dự phòng; server đã tự join) |

**Server → client**

| Sự kiện | Ý nghĩa |
|---|---|
| `online-users`, `user-online`, `user-offline` | Trạng thái online, chỉ gửi tới bạn bè |
| `new-message`, `read-message`, `message-recalled` | Tin mới / đã xem / thu hồi |
| `new-group`, `conversation-deleted` | Hội thoại mới / bị xoá |
| `new-friend-request`, `friend-request-accepted` | Lời mời kết bạn |
| `user-updated` | Đổi tên hoặc avatar (gửi tới chính user và bạn bè) |
| `user-typing`, `user-stop-typing` | Người khác đang soạn tin |

---

## Bảo mật

- **Mật khẩu & token:** mật khẩu băm bằng bcrypt. Access token 15 phút nằm trong bộ nhớ, không lưu localStorage. Refresh token nằm trong cookie httpOnly. Token đặt lại mật khẩu được lưu dạng hash SHA-256.
- **Đặt lại mật khẩu thu hồi mọi phiên:** xoá refresh session, vô hiệu mọi access token phát hành trước đó (`passwordChangedAt`) và ngắt các socket đang mở.
- **Chống chiếm tài khoản qua OAuth:** chỉ tự liên kết OAuth với tài khoản có email đã xác minh. Tài khoản GitHub không có email đã xác minh nhận email giữ chỗ `@github.local`.
- **Rate limit:**

  | Phạm vi | Giới hạn |
  |---|---|
  | Toàn bộ API | 1000 request / 15 phút / IP |
  | Đăng nhập sai | 50 lần / 15 phút |
  | `/forgot-password` | 5 lần / 15 phút / IP, và tối đa 1 email / phút cho mỗi địa chỉ |
  | `/signup` | 10 lần / giờ / IP |
  | Socket | Giới hạn riêng cho gửi tin và "đang soạn tin" |

- **Phân quyền ở service layer:** chỉ nhắn tin được với bạn bè hoặc trong nhóm mình là thành viên. Chỉ người tạo nhóm mới xoá được nhóm. Phân quyền áp dụng như nhau cho REST và socket.
- **Ảnh upload:**
  - Định dạng thật được kiểm tra bằng magic bytes, không tin `mimetype` client gửi lên.
  - Có chặn "decompression bomb".
  - Mọi ảnh được mã hoá lại thành WebP và xoá EXIF (vị trí GPS, thông tin máy chụp…).
- **Đầu vào:** validate ObjectId và độ dài, loại key `$` / `.` khỏi body (chống NoSQL injection), escape regex khi tìm kiếm. `imgUrl` phải thuộc kho ảnh của hệ thống.
- **Quyền riêng tư:** chế độ ẩn danh không bao giờ phát trạng thái online, kể cả sau khi socket được khôi phục.
- **HTTP:** Helmet, CORS whitelist theo `CLIENT_URL`, giới hạn body JSON 1 MB, Swagger tắt ở production.

---

## Cấu trúc thư mục

```text
Realtime_Chat_Application/
├── Backend/
│   ├── src/
│   │   ├── server.js         # HTTP server + Socket.IO + kết nối DB + graceful shutdown
│   │   ├── app.js            # Express app (middleware, rate limit, routes)
│   │   ├── routes/           # auth, friends, messages, conversations, users
│   │   ├── controllers/      # chỉ lo HTTP (status, cookie) → gọi service
│   │   ├── services/         # nghiệp vụ, phân quyền, presence, xử lý & lưu ảnh
│   │   ├── models/           # Mongoose schemas
│   │   ├── middlewares/      # auth JWT, socket auth, upload, xử lý lỗi
│   │   ├── validators/       # kiểm tra input
│   │   ├── socket/           # Socket.IO transport (map event → service)
│   │   ├── realtime/         # emitter: nơi duy nhất giữ instance io
│   │   ├── utils/, config/, libs/
│   │   └── swagger.json
│   └── tests/                # Vitest + mongodb-memory-server
├── frontend/src/
│   ├── pages/, components/
│   ├── hooks/                # TanStack Query (queries + mutations)
│   ├── stores/               # Zustand (auth, chat UI, socket status, theme)
│   ├── services/             # gọi API (Axios)
│   ├── realtime/             # Socket.IO client + handlers
│   └── lib/, config/, types/
├── .github/workflows/ci.yml  # CI: test backend, lint + build frontend
├── docs/DEPLOYMENT.md        # Hướng dẫn deploy (Render + Vercel + Atlas + Cloudinary)
├── render.yaml               # Render Blueprint cho backend
├── API Design.xlsx           # Bản thiết kế API
└── run-local.sh              # Chạy toàn bộ trên localhost
```

---

## Kiểm thử

```bash
cd Backend && npm run check && npm test       # 42 test tích hợp
cd frontend && npm run lint && npm run build  # ESLint + type-check + build
```

Test backend chạy app thật (Express + Socket.IO) trên MongoDB in-memory, nên không cần cài MongoDB và không đụng tới Cloudinary hay SMTP thật:

| File | Nội dung |
|---|---|
| `auth.test.js` | Đăng ký / đăng nhập, access & refresh token, liên kết OAuth chống chiếm tài khoản |
| `group-permissions.test.js` | Quyền tạo / xoá nhóm, chỉ thêm được bạn bè |
| `socket-messaging.test.js` | Xác thực socket, phân quyền gửi tin, unread count khi gửi đồng thời, đã xem |
| `media-upload.test.js` | Kiểm tra định dạng thật, giới hạn kích thước, xử lý ảnh |
| `security-fixes.test.js` | Thu hồi phiên sau đặt lại mật khẩu, chống spam quên mật khẩu, ẩn danh sau khi khôi phục kết nối |

GitHub Actions (`.github/workflows/ci.yml`) chạy các lệnh trên cho mỗi push / PR vào `main`.

---

## Triển khai

Cấu hình gợi ý: backend trên **Render**, frontend trên **Vercel**, DB trên **MongoDB Atlas**, ảnh trên **Cloudinary**. Local và online dùng chung code, chỉ khác biến môi trường.

- **Backend:** `render.yaml` (Render Blueprint) đã khai báo sẵn root `Backend`, build `npm ci`, start `npm start`, health check `/api/health` và Node 22.
- **Frontend:** root `frontend` trên Vercel. `vercel.json` đã có rewrite cho SPA.

👉 Hướng dẫn từng bước, checklist sau deploy và các lỗi thường gặp: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

---

## Giới hạn hiện tại

- **Chạy một tiến trình:** presence (online / offline) và Socket.IO lưu trong bộ nhớ, chưa có Redis adapter. Muốn chạy nhiều instance phải thêm `@socket.io/redis-adapter` và chuyển presence sang Redis.
- **Nhóm:** chưa có rời nhóm, thêm / xoá thành viên, đổi tên nhóm.
- **Email:** chưa xác minh email khi đăng ký bằng mật khẩu. Email chỉ được coi là đã xác minh sau khi đăng nhập OAuth hoặc đặt lại mật khẩu.
- **Ảnh:** thu hồi tin nhắn không xoá file ảnh khỏi kho lưu trữ.

---

**Tác giả:** Võ Thanh Tòng — [github.com/vothanhtong](https://github.com/vothanhtong)
