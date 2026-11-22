# Vận hành và xử lý sự cố

> Live document · Cập nhật: 22/11/2026 (Asia/Saigon).

## Quản trị đánh giá

Sau khi đăng nhập, người dùng điền tên, số sao và nội dung rồi chọn **Gửi đánh giá**. Backend lưu vào bảng `reviews` trên Supabase, gắn với UUID của phiên đăng nhập; database tự lưu email của tài khoản xác thực tại thời điểm gửi. Chỉ admin được API trả email và xem dòng **Gmail đăng nhập**. Email không lấy từ form; sửa đánh giá không thay đổi email đã lưu; đánh giá được giữ sau khi tải lại trang hoặc triển khai lại website.

Quản trị viên đăng nhập, vào phần **Tài khoản AgroCare AI** ở đầu trang và bật **Quản trị: xem lịch sử và đánh giá của tất cả người dùng (chỉ đọc)**. Phần **Đánh giá từ người dùng** sẽ hiển thị đánh giá của mọi tài khoản, mới nhất trước. Chọn **Tải thêm 100 bản ghi** nếu còn dữ liệu. Admin chỉ được sửa/xóa đánh giá do chính mình tạo; người dùng thường chỉ xem đánh giá của mình.

## Quy tắc nhận diện và hạn mức

- JPEG, PNG, GIF, WebP; tối đa **3 MiB**, tối đa **25 triệu pixel**.
- Backend đọc nội dung ảnh thực, chuẩn hóa thành JPEG và thu nhỏ trong khung 1600 × 1600 pixel (không phóng lớn) trước khi gửi DeepSeek/lưu Storage.
- Ảnh sai bị chặn trước khi giữ lượt. Khi bắt đầu gọi AI, lượt đã tính; lỗi AI vẫn tiêu thụ lượt để tránh retry không giới hạn.
- Quota là cửa sổ trượt: người dùng 10 lượt/8 giờ, admin 50 lượt/24 giờ. `resetAt` là thời điểm lượt cũ nhất hết hạn, không phải thời điểm hồi đồng loạt toàn bộ hạn mức. Không reset theo nửa đêm.
- Khi nhận diện, database dọn usage quá 24 giờ của tài khoản đó; các lượt trong 24 giờ được giữ lại kể cả với người dùng thường để tính đúng khi nâng quyền admin. Xóa lịch sử không hoàn lại quota.
- SQL dùng khóa transaction theo user để chặn vượt hạn mức khi gửi nhiều request đồng thời qua các instance Vercel.
- Thành công: backend **tự lưu lịch sử**, sau đó trả kết quả. Client không gọi `POST /api/history` để ghi kết quả tùy ý.

Ảnh lưu trong bucket `plant-images` riêng tư. Browser tải ảnh qua endpoint có bearer token, không dùng public bucket hoặc URL công khai. Admin chỉ được đọc ảnh sau khi server xác định quyền.

## Lưu trữ

SQLite `database/agrocare.db` và ảnh trong `uploads/` của bản cũ không còn được API cloud sử dụng. Chúng vẫn có thể tồn tại trên máy, được ignore bởi Git và **không tự import lên Supabase**. Sao lưu cả database lẫn uploads trước khi chuyển dữ liệu; phải xác định UUID chủ sở hữu từng bản ghi trước khi import. Không tự gán lịch sử cũ thành dữ liệu chung.

Supabase lưu lịch sử đầy đủ dưới `history`, đánh giá dưới `reviews` và lượt sử dụng dưới `recognition_usage`. Các bảng bật RLS, không cho browser đọc/ghi trực tiếp; backend dùng service-role phải luôn kiểm tra user/scope. Theo dõi dung lượng Storage/database và ngân sách AI. Xóa tài khoản cần dọn object Storage riêng, vì database cascade không tự xóa file ảnh.

## Xử lý sự cố

| Hiện tượng | Kiểm tra |
| --- | --- |
| “Chưa cấu hình Supabase” | Kiểm tra URL, public key, service-role key và redeploy/restart |
| Google báo `redirect_uri_mismatch` | Callback Google phải trùng `https://PROJECT_REF.supabase.co/auth/v1/callback`; kiểm tra đúng OAuth client |
| Google chỉ cho tài khoản test đăng nhập | Kiểm tra audience External và trạng thái Production của Google OAuth |
| Đăng nhập quay về sai website hoặc localhost | Kiểm tra Site URL và Redirect URLs trong Supabase Auth |
| 401 | Đăng nhập lại, kiểm tra token có thuộc đúng Supabase project |
| 403 khi xem toàn bộ | UUID tài khoản phải có trong `ADMIN_USER_IDS` ở server |
| Admin vẫn có 10 lượt/8 giờ | Kiểm tra UUID trong `ADMIN_USER_IDS`, migration thứ hai và deployment mới nhất; tải lại trang |
| 429 | Đã dùng hết hạn mức (người dùng 10/8h, admin 50/24h); chờ thời điểm `resetAt` |
| 400 khi upload | Ảnh đúng định dạng, <=3 MiB, <=25 triệu pixel |
| Lỗi database hoặc bucket | Migration đã chạy trên đúng project, bucket private tồn tại |
| Excel thiếu ảnh | Kiểm tra object còn tồn tại và khóa ảnh thuộc đúng chủ sở hữu |
| Dữ liệu biến mất khi đăng nhập tài khoản khác | Đây là phân tách dữ liệu riêng theo user; admin dùng chế độ xem toàn bộ |

## Phát hành và khôi phục

1. Đối chiếu code/env/migration. Sao lưu database và ảnh trước thay đổi dữ liệu.
2. Kiểm tra phù hợp, cập nhật tài liệu và push main để Vercel deploy. Thay env cần deploy lại.
3. Kiểm tra ping, đăng nhập, quota, quyền user/admin và luồng chịu ảnh hưởng trên production.
4. Rollback ứng dụng bằng Vercel hoặc revert commit. Không rollback về backend trả toàn bộ cột review sau migration 003 vì có thể lộ email.
5. Database không tự rollback cùng code. Viết migration khắc phục sau khi đối chiếu schema và bản sao lưu; không chạy lại migration cũ hoặc xóa bảng.

Repository chưa có tác vụ backup/dọn ảnh định kỳ tự động. Cần sao lưu database và object Storage riêng; xóa Auth user chỉ cascade dòng database. Xem [kiểm chứng](VERIFICATION.md) và [bối cảnh](../PROJECT_CONTEXT.MD).
