# 📘 Facebook Auto Posting System (Smart Schedule + Queue + Rate Limit)

---

## 🧠 Tư duy cốt lõi

Hệ thống đăng bài KHÔNG hoạt động theo kiểu:
"Đến giờ là đăng"

Mà phải hoạt động theo:
"Có bài trong hàng đợi → đăng theo tốc độ hợp lý"

---

## ⚙️ Thành phần chính

### 1. Queue (Hàng đợi)
- Chứa tất cả bài cần đăng
- Bao gồm:
  - Bài đúng giờ
  - Bài bị trễ

---

### 2. Rate Limit (Giới hạn tốc độ)
- Không đăng liên tục
- Mỗi bài cách nhau một khoảng thời gian

Ví dụ:
- 3 → 7 phút

---

### 3. Adaptive Delay (Giãn cách thông minh)
- Số bài tồn càng nhiều → đăng nhanh hơn
- Số bài ít → đăng chậm lại

---

## 🔄 Luồng xử lý

### Bước 1: Lấy bài cần đăng
- status = pending
- hoặc time <= now

---

### Bước 2: Đưa vào Queue
- Sắp xếp theo thời gian
- FIFO (First In First Out)

---

### Bước 3: Worker xử lý

Loop:

1. Lấy 1 bài từ queue
2. Đăng bài
3. Nghỉ theo interval
4. Lặp lại

---

## 🧠 Logic tính delay

### Nếu backlog nhỏ:
- 5–10 phút

### Nếu backlog trung bình:
- 3–5 phút

### Nếu backlog lớn:
- 1–3 phút

---

## 🎲 Random

- Luôn random ±30–60s
- Tránh pattern bot

---

## 🧩 Xử lý bài bị trễ

KHÔNG đăng ngay tất cả

→ Đưa vào queue  
→ Đăng lần lượt theo tốc độ

---

## 🧠 Hành vi giống người

- Sau 5–7 bài → nghỉ 10–15 phút
- Không đăng sau 23:00
- Resume lúc 07:00

---

## 🧱 Trạng thái bài

- pending
- queued
- posted
- error
- retrying

---

## 🔁 Tổng flow

1. Cron chạy mỗi phút
2. Lấy bài cần đăng
3. Push vào queue
4. Worker:
   - đăng 1 bài
   - sleep (adaptive delay)
5. Lặp

---

## 🎯 Kết luận

Đăng bài = Queue + Rate Limit + Adaptive Delay

---

## 💡 Nguyên tắc vàng

- Không đăng theo timestamp cứng
- Luôn có queue
- Mỗi lần chỉ đăng 1 bài
- Có delay giữa các bài
- Delay thay đổi theo backlog
