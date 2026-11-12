# 🚀 Hướng dẫn Deploy Firebase OAuth lên Render

## ⚠️ VẤN ĐỀ HIỆN TẠI

Backend trên **Render** có thể **chưa có file `firebase-service-account.json`**, dẫn đến lỗi Google OAuth!

## 📋 Các bước fix

### Cách 1: Upload file qua Secret Files (KHUYẾN NGHỊ)

1. **Vào Render Dashboard**
   - Mở https://dashboard.render.com
   - Chọn service Backend của bạn

2. **Vào Environment**
   - Sidebar → **Environment**
   - Scroll xuống phần **Secret Files**

3. **Thêm Secret File**
   - Click **Add Secret File**
   - **Filename:** `config/firebase-service-account.json`
   - **Contents:** Copy toàn bộ nội dung từ file local:
     ```
     /Users/vothanhtong/Mật /Realtime_Chat_Application/Backend/config/firebase-service-account.json
     ```

4. **Save & Deploy**
   - Click **Save Changes**
   - Render sẽ tự động redeploy

---

### Cách 2: Dùng Environment Variables (Backup plan)

Nếu Render không hỗ trợ Secret Files cho plan của bạn:

1. **Encode file thành Base64**
   ```bash
   base64 -i Backend/config/firebase-service-account.json | pbcopy
   ```
   (Đã copy vào clipboard)

2. **Thêm vào Render Environment Variables**
   - Key: `FIREBASE_SERVICE_ACCOUNT_BASE64`
   - Value: Paste nội dung vừa copy

3. **Sửa code khởi tạo Firebase**
   
   Trong file `Backend/src/config/firebase.js`, thêm logic decode:

   ```javascript
   // After existing code, before "else if (process.env.FIREBASE_PROJECT_ID)"
   
   } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
     // Decode from environment variable (for Render deployment)
     const serviceAccountJson = Buffer.from(
       process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
       'base64'
     ).toString('utf8');
     const serviceAccount = JSON.parse(serviceAccountJson);

     firebaseApp = admin.initializeApp({
       credential: admin.credential.cert(serviceAccount),
     });

     console.log("✅ Firebase Admin initialized from base64 env var");
   } else if (process.env.FIREBASE_PROJECT_ID) {
   ```

---

### Cách 3: Commit file lên Git (KHÔNG KHUYẾN NGHỊ)

⚠️ **Chỉ dùng nếu repo là PRIVATE**

1. Remove file khỏi `.gitignore`:
   ```bash
   # Comment dòng này trong Backend/.gitignore hoặc root .gitignore
   # config/firebase-service-account.json
   ```

2. Commit và push:
   ```bash
   git add Backend/config/firebase-service-account.json
   git commit -m "Add Firebase service account for OAuth"
   git push
   ```

3. Render sẽ tự động deploy khi detect commit mới

⚠️ **Lưu ý bảo mật:**
- Chỉ làm này nếu repo **100% private**
- Nên dùng Cách 1 hoặc 2

---

## ✅ Verify Deploy thành công

### Test 1: Check logs trên Render
Vào **Logs** tab, tìm dòng:
```
✅ Firebase Admin initialized with service account file
```
hoặc
```
✅ Firebase Admin initialized from base64 env var
```

### Test 2: Test API endpoint
```bash
# Lấy idToken từ frontend sau khi sign in với Google
# Sau đó test:
curl -X POST https://realtime-chat-application-backend-s916.onrender.com/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"TEST_TOKEN_HERE"}'
```

**Expected response:**
- ❌ "Invalid Firebase token" → OK (vì token test không hợp lệ, NHƯNG backend đã xử lý được)
- ✅ "Firebase Admin not initialized" → KHÔNG OK, cần fix lại

---

## 🎯 Khuyến nghị

**Dùng Cách 1** (Secret Files) vì:
- ✅ Bảo mật nhất
- ✅ Không cần sửa code
- ✅ Dễ quản lý
- ✅ Không commit vào Git

Sau khi deploy xong, test lại Google OAuth trên production!
