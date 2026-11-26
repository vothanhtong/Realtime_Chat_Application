# 🚀 Triển khai (Deploy)

Cấu hình đang dùng cho bản online:

| Thành phần | Dịch vụ | Ghi chú |
|---|---|---|
| Backend (API + Socket.IO) | **Render** (Web Service) | `render.yaml` ở gốc repo |
| Frontend | **Vercel** | `frontend/vercel.json` (rewrite cho SPA) |
| Database | **MongoDB Atlas** | |
| Ảnh | **Cloudinary** | **Bắt buộc** trên Render: ổ đĩa bị xoá mỗi lần deploy lại |
| Đăng nhập Google / GitHub | **Firebase Auth** | Tuỳ chọn |
| Email quên mật khẩu | **SMTP** (Gmail App Password) | Tuỳ chọn |

> **Local và online dùng chung code, chỉ khác biến môi trường.**
> `./run-local.sh` ghi đè DB thành MongoDB local và tắt Cloudinary mà không sửa `.env`. Vì vậy cùng một file `Backend/.env` (trỏ Atlas + Cloudinary) vẫn dùng được để deploy.

---

## 1. MongoDB Atlas

1. Tạo cluster (gói M0 miễn phí là đủ), rồi tạo **Database User**.
2. Vào **Network Access** → **Add IP Address** → `0.0.0.0/0`. IP của Render thay đổi liên tục nên phải mở cho mọi IP. Bảo mật dựa vào user/password mạnh.
3. Lấy connection string `mongodb+srv://<user>:<pass>@<cluster>/chat_app?retryWrites=true&w=majority` và dùng làm giá trị `MONGODB_CONNECTIONSTRING`.

## 2. Backend trên Render

### Cách A: Blueprint (nhanh nhất)
**Dashboard → New → Blueprint → chọn repo.** Render đọc `render.yaml`: root `Backend`, `npm ci` / `npm start`, health check `/api/health`, Node 22. Sau đó Render hỏi giá trị cho từng biến bí mật.

### Cách B: Tạo Web Service thủ công
- **Root Directory:** `Backend`
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Environment:** như bảng dưới

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` (bật cookie `Secure; SameSite=None`, tắt Swagger) |
| `MONGODB_CONNECTIONSTRING` | Connection string Atlas |
| `ACCESS_TOKEN_SECRET` | Chuỗi ngẫu nhiên dài: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CLIENT_URL` | `https://<app>.vercel.app`. Nhiều origin thì phân tách bằng dấu phẩy. Origin **đầu tiên** được dùng trong link email đặt lại mật khẩu |
| `SERVER_URL` | `https://<service>.onrender.com` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary → Dashboard. Thiếu là server in cảnh báo khi khởi động |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Xem [mục 4](#4-đăng-nhập-google--github-firebase) |
| `SMTP_USER`, `SMTP_PASS` | Gmail + App Password (cần bật xác minh 2 bước) |

**Không cần** đặt `PORT`: Render tự cấp, server đọc `process.env.PORT`.

Kiểm tra: `https://<service>.onrender.com/api/health` phải trả `{"status":"ok","db":true}`.

## 3. Frontend trên Vercel

- **Add New → Project → chọn repo**
- **Root Directory:** `frontend`. Framework được nhận là **Vite**, build `npm run build`, output `dist`.
- **Environment Variables:**

| Biến | Giá trị |
|---|---|
| `VITE_API_URL` | `https://<service>.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://<service>.onrender.com` |
| `VITE_GOOGLE_OAUTH_ENABLED`, `VITE_GITHUB_OAUTH_ENABLED` | `true` / `false` |
| `VITE_FIREBASE_*` | Firebase Console → Project settings → Your apps (công khai theo thiết kế) |

> Biến `VITE_*` được nhúng vào bundle **lúc build**. Đổi biến xong phải **Redeploy** thì mới có hiệu lực.

Sau khi có domain Vercel, quay lại Render và thêm domain đó vào `CLIENT_URL`. Thiếu bước này thì CORS và Socket.IO sẽ từ chối kết nối.

## 4. Đăng nhập Google / GitHub (Firebase)

### Backend: Firebase Admin
Dùng biến môi trường base64 vì Render không có file `Backend/config/firebase-service-account.json` (file này bị gitignore):

```bash
base64 -i Backend/config/firebase-service-account.json | tr -d '\n' | pbcopy   # macOS: copy vào clipboard
```

Dán vào `FIREBASE_SERVICE_ACCOUNT_BASE64` trên Render. Log khởi động đúng sẽ có dòng `✅ Firebase Admin initialized from base64 env var`.

### Firebase Console → Authentication
1. **Sign-in method:** bật **Google** (điền support email) và **GitHub** (Client ID / Secret từ GitHub → Settings → Developer settings → OAuth Apps; callback URL lấy từ màn hình Firebase).
2. **Settings → Authorized domains:** thêm `localhost` và domain Vercel, ví dụ `realtime-chat-application-frontend-ruby.vercel.app`.

### Google Cloud Console → APIs & Services
- **Credentials → Web client (auto created by Google Service):**
  - *Authorized JavaScript origins:* `http://localhost:5173`, `https://<app>.vercel.app`
  - *Authorized redirect URIs:* `http://localhost:5173/__/auth/handler`, `https://<app>.vercel.app/__/auth/handler`
- **OAuth consent screen:** nếu đang ở chế độ *Testing* thì thêm email của bạn vào **Test users**.

## 5. Checklist sau khi deploy

- [ ] `/api/health` trả `ok`
- [ ] Đăng ký và đăng nhập được, F5 trang vẫn còn đăng nhập (refresh cookie hoạt động)
- [ ] Hai trình duyệt nhắn tin cho nhau thấy ngay (Socket.IO), có trạng thái online và "đang soạn tin"
- [ ] Gửi ảnh và đổi avatar, rồi deploy lại backend: ảnh vẫn còn (Cloudinary)
- [ ] Quên mật khẩu nhận được email, link mở đúng domain Vercel
- [ ] Đăng nhập Google / GitHub (nếu bật)

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| Request đầu tiên mất 30–50 giây | Render free tier ngủ sau ~15 phút không có request. Frontend đã đặt timeout 30 giây. Muốn hết hẳn thì nâng gói, hoặc ping `/api/health` định kỳ |
| Lỗi CORS / socket không kết nối | `CLIENT_URL` trên Render thiếu domain Vercel (phải khớp tuyệt đối: `https://`, không có `/` ở cuối) |
| F5 là bị đăng xuất | Backend thiếu `NODE_ENV=production` nên cookie không có `Secure; SameSite=None`. Hoặc xem dòng Safari bên dưới |
| Safari / iPhone hay bị đăng xuất | Safari chặn cookie bên thứ ba (`*.vercel.app` ↔ `*.onrender.com` là hai site khác nhau). Cách sửa triệt để: dùng tên miền riêng chung một site, ví dụ `app.ten-mien.com` + `api.ten-mien.com` |
| Ảnh biến mất sau khi deploy lại | Chưa cấu hình Cloudinary nên ảnh đã lưu trên ổ đĩa tạm của Render |
| `auth/unauthorized-domain` | Domain chưa có trong Firebase → Authorized domains |
| Popup Google bị chặn hoặc bị đóng | Cho phép popup cho domain, rồi thử lại |
| OAuth trả 500 / "authentication failed" | Firebase Admin chưa khởi tạo. Xem log Render, kiểm tra `FIREBASE_SERVICE_ACCOUNT_BASE64` có đúng project không |
| OAuth trả 409 | Email đã đăng ký bằng mật khẩu nhưng chưa xác minh. Đăng nhập bằng mật khẩu, hoặc dùng "Quên mật khẩu" trước (chống chiếm tài khoản) |
| Không gửi được email quên mật khẩu | Gmail cần **App Password**, không dùng mật khẩu thường. Kiểm tra `SMTP_USER` / `SMTP_PASS` |
