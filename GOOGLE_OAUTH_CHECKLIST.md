# Google OAuth Troubleshooting Checklist ✅

## ✅ Backend Setup (Đã hoàn tất)

1. ✅ **Firebase Admin SDK** đã được khởi tạo
   - File: `Backend/config/firebase-service-account.json` ✓
   - Project ID: `realtimechatapplication-f1fb5` ✓
   - Test khởi tạo: **PASSED** ✓

2. ✅ **Backend .env** đã cấu hình
   - `FIREBASE_PROJECT_ID=realtimechatapplication-f1fb5` ✓

3. ✅ **API Route** đã có
   - `POST /api/auth/oauth/google` ✓
   - Controller: `firebaseOAuthController.js` ✓

## ✅ Frontend Setup (Đã hoàn tất)

1. ✅ **Firebase Web Config** đã đầy đủ trong `.env`
   - API Key ✓
   - Auth Domain ✓
   - Project ID ✓
   - Storage Bucket ✓
   - Messaging Sender ID ✓
   - App ID ✓

2. ✅ **OAuth Service** đã có logic đầy đủ
   - `signInWithPopup` ✓
   - `GoogleAuthProvider` ✓
   - Gửi `idToken` lên backend ✓

## ⚠️ Firebase Console Settings (CẦN KIỂM TRA)

### Bước 1: Kiểm tra Authentication Methods
Vào **Firebase Console** → Project `realtimechatapplication-f1fb5` → **Authentication** → **Sign-in method**

Xem provider **Google** có được **Enable** không:
- [ ] Google provider status = **Enabled**
- [ ] Support email = configured

### Bước 2: Kiểm tra Authorized Domains
Trong **Authentication** → **Settings** → **Authorized domains**

Phải có các domain sau:
- [ ] `localhost` (cho dev)
- [ ] `realtime-chat-application-frontend-ruby.vercel.app` (production frontend)
- [ ] `realtime-chat-application-mocha.vercel.app` (nếu còn dùng)

### Bước 3: Kiểm tra OAuth Consent Screen (Google Cloud Console)
Vào **Google Cloud Console** → Project → **APIs & Services** → **OAuth consent screen**

- [ ] User Type: **External** hoặc **Internal**
- [ ] Publishing status: **Testing** hoặc **In Production**
- [ ] Test users: Thêm email của bạn vào danh sách test users (nếu đang ở mode Testing)

### Bước 4: Kiểm tra OAuth 2.0 Client ID
Vào **Google Cloud Console** → **APIs & Services** → **Credentials** → **Web client (auto created by Google Service)**

Authorized JavaScript origins:
- [ ] `http://localhost:5173`
- [ ] `http://localhost:5174`
- [ ] `https://realtime-chat-application-frontend-ruby.vercel.app`
- [ ] `https://realtime-chat-application-mocha.vercel.app`

Authorized redirect URIs:
- [ ] `http://localhost:5173/__/auth/handler`
- [ ] `https://realtime-chat-application-frontend-ruby.vercel.app/__/auth/handler`

## 🐛 Cách Debug Lỗi Google OAuth

### Test 1: Kiểm tra Frontend Firebase Config
Mở Developer Console trong trình duyệt (F12) → Console tab
Chạy:
```javascript
console.log(import.meta.env.VITE_FIREBASE_API_KEY);
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

**Expected:** Phải hiển thị giá trị thực, không phải `undefined`

### Test 2: Kiểm tra Network Request
1. Mở Developer Tools (F12) → **Network** tab
2. Click "Đăng nhập với Google"
3. Quan sát các request:
   - Firebase popup authentication
   - `POST /api/auth/oauth/google` với `idToken` trong body

### Test 3: Kiểm tra Backend Logs
Nếu đang chạy local backend:
```bash
cd Backend
npm run dev
```

Sau khi click "Đăng nhập với Google", xem logs:
- ✅ "Firebase Admin initialized with service account file"
- ❌ Có lỗi gì không?

### Test 4: Test với CURL (production)
```bash
# Lấy idToken từ frontend console sau khi đăng nhập Firebase
# Rồi test:
curl -X POST https://realtime-chat-application-backend-s916.onrender.com/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_FIREBASE_ID_TOKEN_HERE"}'
```

## 🔥 Lỗi phổ biến và cách fix

### Lỗi: "Popup bị chặn"
**Nguyên nhân:** Trình duyệt chặn popup
**Fix:** Cho phép popup cho domain này trong browser settings

### Lỗi: "auth/unauthorized-domain"
**Nguyên nhân:** Domain chưa được thêm vào Firebase Authorized domains
**Fix:** Thêm domain vào Firebase Console → Authentication → Settings → Authorized domains

### Lỗi: "auth/popup-closed-by-user"
**Nguyên nhân:** User đóng popup trước khi hoàn tất
**Fix:** Thử lại

### Lỗi: Backend trả về 500 hoặc "Invalid Firebase token"
**Nguyên nhân:** 
- Firebase Admin SDK chưa được init đúng
- Service account key file sai
- Token đã hết hạn

**Fix:**
1. Kiểm tra backend logs
2. Verify service account file đúng project
3. Thử lại từ đầu (đóng popup, click lại)

### Lỗi: "Firebase chưa được cấu hình"
**Nguyên nhân:** Frontend `.env` thiếu hoặc sai
**Fix:** 
1. Kiểm tra `.env` có đầy đủ `VITE_FIREBASE_*`
2. Restart dev server: `npm run dev`
3. Hard refresh browser: Cmd+Shift+R

## 📋 Action Items

1. **Kiểm tra Firebase Console:**
   - [ ] Enable Google sign-in method
   - [ ] Thêm authorized domains
   - [ ] Verify OAuth consent screen

2. **Kiểm tra Google Cloud Console:**
   - [ ] Thêm JavaScript origins
   - [ ] Thêm redirect URIs
   - [ ] Nếu ở Test mode, thêm email vào test users

3. **Deploy lên Render Backend:**
   - [ ] Upload `firebase-service-account.json` lên Render
   - [ ] Set environment variable `FIREBASE_PROJECT_ID=realtimechatapplication-f1fb5`

4. **Test lại:**
   - [ ] Local: http://localhost:5173/signin
   - [ ] Production: https://realtime-chat-application-frontend-ruby.vercel.app/signin

## 🎯 Next Steps

Hãy làm theo thứ tự:
1. Vào Firebase Console kiểm tra mục "Authorized domains"
2. Vào Google Cloud Console kiểm tra "OAuth 2.0 Client ID"
3. Test lại trên production
4. Nếu vẫn lỗi, gửi screenshot lỗi từ browser console
