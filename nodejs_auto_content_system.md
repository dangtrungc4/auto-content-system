# 🚀 FULL NO-CODE SYSTEM (NODEJS READY) — AUTO CONTENT + GOOGLE SHEETS + FACEBOOK

## 🎯 Mục tiêu
- Không cần code logic phức tạp
- Có thể triển khai bằng Node.js environment
- Tự động hóa hoàn toàn content pipeline

---

## 🧠 KIẾN TRÚC

AI → Google Sheets → Node.js Worker → Facebook → Update trạng thái

---

## ⚙️ PHẦN 1 — CHUẨN BỊ

### 1. Cài Node.js
- Tải: https://nodejs.org
- Kiểm tra:
```bash
node -v
npm -v
```

---

### 2. Tạo project

```bash
mkdir auto-content-system
cd auto-content-system
npm init -y
```

---

### 3. Cài thư viện

```bash
npm install googleapis axios node-cron dotenv
```

---

## 📊 PHẦN 2 — GOOGLE SHEETS

Tạo bảng:

Ngày | Giờ | Chủ đề | Content | Caption | Image URL | Hashtag | Trạng thái

### Quy tắc:
- "Chưa đăng" → sẽ post
- "Đã đăng" → bỏ qua

---

## 🔑 PHẦN 3 — GOOGLE API

### 1. Tạo credentials
- Google Cloud Console
- Enable Google Sheets API
- Create Service Account
- Download JSON

### 2. Share sheet
- Share cho email service account

---

## 🔗 PHẦN 4 — FACEBOOK

### 1. Tạo App
- https://developers.facebook.com

### 2. Lấy quyền
- pages_manage_posts
- pages_read_engagement

### 3. Lấy token
- Page Access Token

---

## 🖼️ PHẦN 5 — ẢNH

### 1. API
- Unsplash
- Pexels

### 2. Logic
- Query: "vietnam old days + chủ đề"
- Chọn ảnh phù hợp

---

## 🤖 PHẦN 6 — WORKFLOW

1. Đọc Google Sheets
2. Lọc:
   - Trạng thái = Chưa đăng
   - Giờ = hiện tại
3. Lấy:
   - caption
   - image
4. Gửi lên Facebook
5. Update trạng thái → Đã đăng

---

## ⏰ PHẦN 7 — SCHEDULER

- Dùng node-cron
- Chạy mỗi 5 phút

---

## 💬 PHẦN 8 — TĂNG TƯƠNG TÁC

### Hook:
"Bạn còn nhớ không?"

### CTA:
"Comment nếu bạn từng trải qua ❤️"

### Seeding:
- 2–3 comment đầu

---

## ⚠️ PHẦN 9 — LƯU Ý

- Không spam
- Không đăng quá nhiều
- Delay hợp lý

---

## 🚀 PHẦN 10 — VẬN HÀNH

1. Thêm dòng vào Google Sheets
2. Set "Chưa đăng"
3. Hệ thống tự chạy

