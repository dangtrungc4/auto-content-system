# 📄 PLAN: Parse nội dung bài viết → Mapping vào Google Sheet

## 🎯 Mục tiêu

Từ 1 input textarea có format cố định, hệ thống sẽ: - Tách đúng từng
phần nội dung - Map chính xác vào các cột: - Caption - Content - Hashtag

------------------------------------------------------------------------

## 🧩 Input

\[ SG • 2026 . 03 . 25 \]

"ĐÊM CÓ ĐOM ĐÓM"

Ngày xưa, đêm không tối hẳn.

...

#gocnhocuamia #miake #demxua #binhyen

------------------------------------------------------------------------

## 🔍 Quy tắc tách

### Caption

-   Dòng 1 + dòng 2

### Content

-   Từ dòng 3 đến trước hashtag

### Hashtag

-   Dòng cuối

------------------------------------------------------------------------

## 📊 Mapping

  Caption   Content   Hashtag
  --------- --------- ---------


-  Các cột còn lại:
    - Ngày: sẽ lấy ngày lúc parse
    - Giờ: sẽ lấy random khoảng giờ 12:00:00 - 13:00:00 hoặc 18:00:00 - 19:00:00 không vượt quá 24h trong 1 ngày
    - Chủ đề: để trống
    - Image URL: sẽ tìm ảnh bằng api của unsplash, sau đó lưu lại bằng link, hãy dùng dòng 2 caption để tìm ảnh
    - Trạng thái: mặc định Chưa đăng
------------------------------------------------------------------------

## 🚀 Flow

Textarea → parse → save google sheet

