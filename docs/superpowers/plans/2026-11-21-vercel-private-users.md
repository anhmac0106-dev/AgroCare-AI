# Hồ sơ kế hoạch: triển khai người dùng riêng tư trên Vercel

> **Trạng thái: Hoàn tất và đã triển khai.** Tài liệu này lưu bối cảnh quyết định ban đầu; checklist bên dưới phản ánh hiện trạng kiểm tra ngày 21/11/2026. Hướng dẫn vận hành hiện hành nằm ở [docs/DEPLOYMENT.md](../../DEPLOYMENT.md).

## Mục tiêu hiện hành

Vercel Hobby + Supabase Free; Google OAuth; dữ liệu riêng từng người dùng; admin đọc toàn bộ; quota thường 10 lượt/8 giờ và admin 50 lượt/24 giờ; kiểm tra nội dung đầu vào. Express chạy API/UI. Backend xác thực Supabase Auth qua `getUser`, lưu Postgres/Storage riêng tư và giới hạn truy vấn theo user hoặc scope admin đã xác minh.

## Trạng thái giao hàng

- [x] Supabase schema, RLS, private image bucket, usage RPC có khóa theo user và migrations quota/email đánh giá đã áp dụng.
- [x] Google OAuth Production; đăng nhập, khôi phục phiên và đăng xuất đã kiểm tra. Email/password provider và anonymous sign-in tắt; không dùng SMTP.
- [x] Backend xác thực user, giới hạn ảnh 3 MiB/25 MP, chuẩn hóa ảnh, tự lưu lần nhận diện, review và export.
- [x] Quota trượt: thường 10/8 giờ; admin 50/24 giờ. Backend lấy vai trò từ `ADMIN_USER_IDS`; database lưu email đánh giá từ Auth.
- [x] Giao diện admin scope read-only, Gmail của đánh giá chỉ cho admin, 5 trạng thái kết quả prompt và Excel có ảnh nhúng.
- [x] Bộ test ứng dụng: 22 bài đạt ở lần kiểm tra ghi nhận. Kiểm tra SQL production quota/email chạy rollback.
- [ ] Chưa chạy harness 20 request Postgres đồng thời trong project test riêng.
- [ ] Chưa xác minh nhận diện DeepSeek và Excel bằng ảnh thật trên production hoặc đo prompt trên tập ảnh thực địa.

## Giao diện hiện hành

- `GET /api/config` chỉ trả Supabase URL và public key. API dữ liệu yêu cầu bearer token.
- `GET /api/me` trả user, vai trò và quota; hai quota RPC nhận `p_user_id` và `p_is_admin`, chỉ service role được gọi.
- `GET /api/history` và `GET /api/reviews` trả dữ liệu của user; admin thêm `scope=all`. Email review chỉ có trong phản hồi admin.
- `POST /api/detect` nhận multipart `image`, xác thực/chuẩn hóa, giữ quota, gọi DeepSeek và tự lưu. Lượt lỗi nhà cung cấp không được hoàn lại.
- `POST /api/reviews` nhận tên, sao và nội dung. Trigger database gắn email từ `auth.users`, bỏ qua email do request gửi; chỉ admin được đọc email.

## Migrations và tài liệu vận hành

Production đã áp dụng migrations theo thứ tự: `202611210001_private_users.sql`, `202611210002_admin_quota.sql`, `202611210003_review_email.sql`. Không chạy lại migration đã áp dụng. README hướng dẫn setup local; [docs/DEPLOYMENT.md](../../DEPLOYMENT.md) là hướng dẫn hiện hành cho cấu hình, migration và nghiệm thu.
