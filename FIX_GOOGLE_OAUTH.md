# 🔧 Hướng dẫn FIX lỗi Google OAuth

## 📊 Tình trạng hiện tại

✅ **Backend local:** Firebase Admin SDK hoạt động tốt  
⚠️ **Backend Render:** Chưa có Firebase service account file  
✅ **Frontend:** Cấu hình Firebase đầy đủ  

---

## 🚀 CÁCH FIX NHANH NHẤT (3 bước)

### Bước 1: Upload Firebase Service Account lên Render

**Option A: Dùng Secret Files (KHUYẾN NGHỊ)**

1. Vào https://dashboard.render.com
2. Chọn Backend service: `realtime-chat-application-backend-s916`
3. Sidebar → **Environment**
4. Scroll xuống **Secret Files**
5. Click **Add Secret File**
   - **Filename:** `config/firebase-service-account.json`
   - **Contents:** Copy toàn bộ nội dung từ file:
     ```
     Backend/config/firebase-service-account.json
     ```
6. Click **Save Changes** → Render sẽ tự động redeploy

**Option B: Dùng Environment Variable (nếu không có Secret Files)**

1. Vào https://dashboard.render.com
2. Chọn Backend service
3. Sidebar → **Environment**
4. Click **Add Environment Variable**
5. Thêm:
   ```
   Key: FIREBASE_SERVICE_ACCOUNT_BASE64
   Value: (copy từ file Backend/firebase-service-account-base64.txt)
   ```
6. Save → Redeploy

---

### Bước 2: Kiểm tra Firebase Console

Vào: https://console.firebase.google.com/project/realtimechatapplication-f1fb5

#### 2.1 Enable Google Sign-in Method
- **Authentication** → **Sign-in method**
- Tìm **Google** provider
- Nếu chưa enable → Click **Enable**
- Điền support email
- Save

#### 2.2 Thêm Authorized Domains
- **Authentication** → **Settings** → **Authorized domains**
- Phải có các domain:
  - `localhost` ✓
  - `realtime-chat-application-frontend-ruby.vercel.app` 
  - `realtime-chat-application-mocha.vercel.app`
  
- **Nếu thiếu domain Vercel:**
  - Click **Add domain**
  - Nhập: `realtime-chat-application-frontend-ruby.vercel.app`
  - Save

---

### Bước 3: Kiểm tra Google Cloud Console

Vào: https://console.cloud.google.com/apis/credentials?project=realtimechatapplication-f1fb5

#### 3.1 Tìm OAuth 2.0 Client ID
- Tìm client có tên: **Web client (auto created by Google Service)**
- Click vào để edit

#### 3.2 Thêm Authorized JavaScript origins
Phải có:
```
http://localhost:5173
http://localhost:5174
https://realtime-chat-application-frontend-ruby.vercel.app
https://realtime-chat-application-mocha.vercel.app
```

**Nếu thiếu Vercel domain:**
- Click **+ ADD URI**
- Nhập: `https://realtime-chat-application-frontend-ruby.vercel.app`
- Save

#### 3.3 Thêm Authorized redirect URIs
Phải có:
```
http://localhost:5173/__/auth/handler
https://realtime-chat-application-frontend-ruby.vercel.app/__/auth/handler
```

**Nếu thiếu:**
- Click **+ ADD URI**
- Nhập: `https://realtime-chat-application-frontend-ruby.vercel.app/__/auth/handler`
- Save

#### 3.4 Kiểm tra OAuth Consent Screen
- Sidebar → **OAuth consent screen**
- Nếu **Publishing status = Testing:**
  - Scroll xuống **Test users**
  - Click **+ ADD USERS**
  - Thêm email Google của bạn
  - Save

---

## ✅ Verify sau khi fix

### 1. Check Render Logs
Vào Render Dashboard → Backend service → **Logs**

Tìm dòng:
```
✅ Firebase Admin initialized with service account file
```
hoặc
```
✅ Firebase Admin initialized from base64 env var
```

**Nếu thấy:** Firebase đã OK ✅

### 2. Test trên Production
1. Vào: https://realtime-chat-application-frontend-ruby.vercel.app/signin
2. Click nút **"Đăng nhập với Google"**
3. Chọn tài khoản Google
4. **Expected:** Đăng nhập thành công → redirect về trang chat

### 3. Check Browser Console (nếu lỗi)
- Mở DevTools (F12) → Console
- Xem có lỗi gì không:
  - `auth/unauthorized-domain` → Thiếu domain trong Firebase
  - `auth/popup-blocked` → Trình duyệt chặn popup
  - `Invalid Firebase token` → Backend chưa init Firebase
  - Lỗi CORS → Backend chưa thêm Vercel domain vào CORS

---

## 🐛 Debug Commands

### Test Backend Firebase trên Render
```bash
# Sẽ trả về lỗi "Invalid Firebase token" nhưng đó là OK
# (vì token test không hợp lệ, NHƯNG backend đã xử lý được)
curl -X POST https://realtime-chat-application-backend-s916.onrender.com/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test"}'
```

**Expected response:**
```json
{"message":"Invalid or expired Firebase token"}
```

**Nếu trả về:**
```json
{"message":"Firebase Admin not initialized"}
```
→ Chưa upload Firebase service account lên Render

---

## 📝 Checklist cuối cùng

- [ ] **Render:** Đã upload `firebase-service-account.json` (Secret Files hoặc Base64 env var)
- [ ] **Render:** Logs hiển thị "Firebase Admin initialized"
- [ ] **Firebase Console:** Google sign-in method đã enable
- [ ] **Firebase Console:** Authorized domains có domain Vercel
- [ ] **Google Cloud Console:** OAuth Client ID có JavaScript origins của Vercel
- [ ] **Google Cloud Console:** OAuth Client ID có redirect URIs của Vercel
- [ ] **Google Cloud Console:** Nếu ở Test mode, đã thêm email vào test users
- [ ] **Test:** Đăng nhập Google trên production thành công

---

## 💡 Tips

### Lỗi "Popup bị chặn"
- Allow popup cho domain này trong browser settings
- Thử browser khác (Chrome, Safari, Firefox)

### Lỗi "auth/unauthorized-domain"
- Check domain trong URL bar
- So sánh với danh sách Authorized domains trong Firebase Console
- Phải khớp 100% (không có trailing slash)

### Lỗi vẫn không fix được
1. Hard refresh browser: **Cmd+Shift+R** (Mac) hoặc **Ctrl+Shift+R** (Windows)
2. Clear browser cache
3. Thử incognito/private mode
4. Check Render logs xem có lỗi gì
5. Gửi screenshot lỗi từ browser console

---

## 📞 Nếu vẫn lỗi, cần check:

1. Screenshot của Firebase Console → Authorized domains
2. Screenshot của Google Cloud Console → OAuth Client ID settings
3. Screenshot của browser console khi click "Đăng nhập với Google"
4. Screenshot của Render logs sau khi deploy

Gửi 4 screenshot này để debug thêm!
