# Hồ sơ kế hoạch: triển khai người dùng riêng tư trên Vercel

> **Trạng thái: Đã triển khai; nghiệm thu còn một phần.** Tài liệu này lưu bối cảnh quyết định ban đầu; checklist bên dưới phản ánh hiện trạng kiểm tra ngày 21/11/2026. Hướng dẫn vận hành hiện hành nằm ở [docs/DEPLOYMENT.md](../../DEPLOYMENT.md).

## Mục tiêu hiện hành

Vercel Hobby + Supabase Free; Google OAuth; dữ liệu riêng từng người dùng; admin đọc toàn bộ; quota thường 10 lượt/8 giờ và admin 50 lượt/24 giờ; kiểm tra nội dung đầu vào. Express chạy API/UI. Backend xác thực Supabase Auth qua `getUser`, lưu Postgres/Storage riêng tư và giới hạn truy vấn theo user hoặc scope admin đã xác minh.

## Bàn giao hiện hành

Kế hoạch triển khai đã thực hiện; kiểm chứng còn một phần chưa nghiệm thu. Bản này là hồ sơ lịch sử, không phải checklist hiện hành. Xem [PROJECT_CONTEXT.MD](../../../PROJECT_CONTEXT.MD) cho bối cảnh mới nhất và [VERIFICATION.md](../../VERIFICATION.md) cho bằng chứng/nghiệm thu. Các thay đổi UI tiếp theo gồm responsive lịch sử, font tiếng Việt, tiến trình nhận diện và bỏ nút Làm mới.

## Giao diện hiện hành

- `GET /api/config` chỉ trả Supabase URL và public key. API dữ liệu yêu cầu bearer token.
- `GET /api/me` trả user, vai trò và quota; hai quota RPC nhận `p_user_id` và `p_is_admin`, chỉ service role được gọi.
- `GET /api/history` và `GET /api/reviews` trả dữ liệu của user; admin thêm `scope=all`. Email review chỉ có trong phản hồi admin.
- `POST /api/detect` nhận multipart `image`, xác thực/chuẩn hóa, giữ quota, gọi DeepSeek và tự lưu. Lượt lỗi nhà cung cấp không được hoàn lại.
- `POST /api/reviews` nhận tên, sao và nội dung. Trigger database gắn email từ `auth.users`, bỏ qua email do request gửi; chỉ admin được đọc email.

## Migrations và tài liệu vận hành

Production đã áp dụng migrations theo thứ tự: `202611210001_private_users.sql`, `202611210002_admin_quota.sql`, `202611210003_review_email.sql`. Không chạy lại migration đã áp dụng. README hướng dẫn setup local; [docs/DEPLOYMENT.md](../../DEPLOYMENT.md) là hướng dẫn hiện hành cho cấu hình, migration và nghiệm thu.
