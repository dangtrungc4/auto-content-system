# Khởi tạo Hệ thống Auto Content Bài bản 🚀

Hệ thống Auto Content của bạn đã được triển khai thành công 100% dựa trên kế hoạch được duyệt. Nó bao gồm 1 Backend chạy ngầm (Node.js) và 1 Giao diện Quản lý cao cấp (Dashboard).

---

## 🛠 Những gì đã được xây dựng

### 1. Giao diện Quản lý (Dashboard)
Một giao diện cực đẹp trong thư mục `public` (HTML, CSS Dark Mode, Vanilla JS).
- Chức năng theo dõi thông số: Số bài chờ, đã đăng, thất bại.
- Bảng điều khiển (Control Panel): Có thể nhấn `Start Engine`, `Stop Engine` và `Run Now`.
- Hệ thống Logs: Hiển thị thời gian thực các bước xử lý (đọc Sheets, lấy ảnh, đăng bài).
- Cài đặt (Settings): Nơi bạn điền API key cho Facebook, Google Sheets, Unsplash và Crontab.

### 2. Các Service Backend (`/services`)
- **`config.js`**: Lưu trữ cài đặt an toàn vào file `data/config.json`.
- **`scheduler.js`**: `node-cron` chạy các job theo tần suất (VD: `*/5 * * * *`).
- **`googleSheets.js`**: Kết nối với Google API, đọc bảng dữ liệu từ Sheet (cột H cho trạng thái chưa đăng, cột A-G cho text). Tự động update thành "Đã đăng" hoặc "Lỗi".
- **`facebook.js`**: Tương tác với Graph API để đăng Status và Ảnh.
- **`images.js`**: Lấy ảnh miễn phí theo từ khoá qua API của Unsplash.

---

## 🎯 Hướng dẫn sử dụng

### Bước 1: Khởi động hệ thống
Mở Terminal, di chuyển tới thư mục dự án và chạy:
```bash
cd auto-content-system
node server.js
```
Hệ thống sẽ chạy ở cổng `3000`.

### Bước 2: Cấu hình qua Dashboard
Truy cập trình duyệt: **`http://localhost:3000`**
1. Chọn tab **Settings**.
2. Điền các Key yêu cầu:
   - `Google Sheet ID` (chuỗi ký tự dài trên link Google Sheet của bạn).
   - `Google Client Email` và `Private Key` (lấy từ file JSON tải ở Google Cloud).
   - `Facebook App ID` và `Page Access Token` (từ Meta for Developers).
   - `Unsplash Key` (nếu cần tự tạo ảnh xịn).
3. Nhấn **Save**.

### Bước 3: Vận hành
- Nhấn tab **Dashboard** -> Nhấn **Start Engine** để bắt đầu treo máy (Cứ 5 phút check sheets 1 lần).
- Hoặc nếu lười đợi -> Nhấn **Run Now** để nó quét ngay lập tức.
- Bạn chỉ cần ra Google Sheets, nhấp "Chưa đăng" vào những bài cần lên. Hệ thống tự quét và up thẳng lên Page của bạn.

> [!TIP]
> Bạn có thể chạy lệnh `npm install -g pm2` và `pm2 start server.js` để tool tự động chạy ngầm trên máy ngay cả khi bạn đóng Terminal!
