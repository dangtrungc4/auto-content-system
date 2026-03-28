# 📘 Auto Content System - Trang Quản Lý Bài Viết

## 1. Tổng quan

Trang quản lý bài viết (Post Management) là trung tâm của hệ thống, cho
phép: - Tạo, chỉnh sửa, lưu trữ bài viết - Lên lịch đăng bài - Quản lý
trạng thái nội dung - Theo dõi & tối ưu SEO

------------------------------------------------------------------------

## 2. Mục tiêu

-   Quản lý toàn bộ nội dung tại 1 nơi
-   Tối ưu workflow: viết → duyệt → đăng
-   Dễ mở rộng (AI, automation sau này)

------------------------------------------------------------------------

## 3. Chức năng chính

### 3.1 Danh sách bài viết

-   Hiển thị table:
    -   Title
    -   Status
    -   Author
    -   Created date
    -   Scheduled date
-   Filter:
    -   Status (draft, scheduled, published)
    -   Author
-   Search theo keyword

------------------------------------------------------------------------

### 3.2 Tạo / chỉnh sửa bài viết

-   Input:
    -   Title
    -   Content (rich text editor)
    -   Category
    -   Tags
-   SEO:
    -   Slug
    -   Meta title
    -   Meta description

------------------------------------------------------------------------

### 3.3 Trạng thái bài viết

-   Draft
-   Scheduled
-   Published

------------------------------------------------------------------------

### 3.4 Lập lịch đăng bài

-   Chọn datetime
-   Auto chuyển sang published khi tới giờ

------------------------------------------------------------------------

### 3.5 Workflow (optional)

-   Editor tạo bài
-   Admin duyệt
-   Publish

------------------------------------------------------------------------

### 3.6 Xóa / khôi phục

-   Soft delete
-   Restore bài viết

------------------------------------------------------------------------

## 4. Database Schema

### posts

-   id
-   title
-   content
-   status
-   scheduled_at
-   published_at
-   author_id
-   created_at
-   updated_at

### users

-   id
-   name
-   role

------------------------------------------------------------------------

## 5. API Design

### POST /posts

Tạo bài viết

### GET /posts

Lấy danh sách

### GET /posts/:id

Chi tiết bài viết

### PUT /posts/:id

Update

### DELETE /posts/:id

Xóa

------------------------------------------------------------------------

## 6. Cron Job

Chạy mỗi 5 phút: - Lấy bài scheduled - Publish - Update status

------------------------------------------------------------------------

## 7. UI Layout

### Sidebar

-   Dashboard
-   Posts
-   Categories
-   Settings

### Main Page

-   Table bài viết
-   Nút create

### Editor Page

-   Form + content editor


*Tạo lúc: 2026-03-27 07:42:08.471661*
