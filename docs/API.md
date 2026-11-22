# API và hợp đồng dữ liệu

> Live document · Cập nhật: 22/11/2026 (Asia/Saigon).

Ngoại trừ `/api/ping` và `/api/config`, các API dưới đây yêu cầu `Authorization: Bearer <access_token>` của phiên Supabase hợp lệ. Không đưa access token vào query string.

| Method | Endpoint | Công dụng |
| --- | --- | --- |
| GET | `/api/ping` | Kiểm tra server |
| GET | `/api/config` | Chỉ trả Supabase URL và public key |
| GET | `/api/me` | Tài khoản, quyền admin và quota |
| GET | `/api/check-ai` | Kiểm tra có cấu hình khóa AI; không xác thực khóa với nhà cung cấp |
| POST | `/api/detect` | Multipart field `image`; phân tích và tự lưu lịch sử |
| GET | `/api/history` | Tối đa 100 dòng lịch sử, mới nhất trước |
| GET | `/api/history/:id/image` | Ảnh riêng tư; chủ sở hữu hoặc admin được xem |
| GET | `/api/history/export-excel` | Tối đa 20 dòng mỗi lần xuất, có ảnh nhúng |
| DELETE | `/api/history` | Xóa lịch sử của chính mình và dọn ảnh tương ứng |
| GET | `/api/statistics` | Thống kê trên tối đa 100 dòng được truy vấn |
| GET | `/api/reviews` | Tối đa 100 đánh giá |
| POST | `/api/reviews` | Tạo đánh giá: `name`, `star` (1–5), `content` |
| PUT | `/api/reviews/:id` | Sửa `name`, `content` của đánh giá do mình tạo |
| DELETE | `/api/reviews/:id` | Xóa đánh giá do mình tạo |

API danh sách, thống kê và Excel hỗ trợ `offset` không âm. Ví dụ `/api/history?offset=100` lấy trang tiếp theo; `/api/history/export-excel?offset=20` xuất nhóm 20 dòng tiếp theo. Admin thêm `scope=all` để đọc toàn bộ theo từng trang; người dùng thường nhận 403 khi yêu cầu scope này. Thao tác xóa lịch sử không nhận scope toàn bộ.

`POST /api/history` trả 405 vì lịch sử chỉ được tạo từ nhận diện thành công. API like đánh giá cũ không còn được hỗ trợ.

Phản hồi nhận diện gồm `success`, `historyId`, `image` (khóa object riêng tư), `result` (chuỗi JSON) và `quota`. Các trường đã parse được lưu thêm trong cột `result` của lịch sử; API danh sách không trả toàn bộ cột JSON này để giữ phản hồi gọn. Hết hạn mức trả HTTP 429 cùng quota và `Retry-After`.

## Xuất báo cáo

Excel có STT, tên bệnh, mức độ, hướng xử lý, hình ảnh và thời gian. Ảnh được nhúng trong workbook, giữ tỷ lệ và neo tại dòng tương ứng; mở file không cần tải lại ảnh từ server.

- **Excel:** nút xuất lấy tối đa **20 lần phân tích gần nhất** trong phạm vi tài khoản hoặc chế độ admin đang chọn. API hỗ trợ `offset` để xuất các nhóm tiếp theo. Workbook vượt **4 MiB** bị từ chối.
- **JSON:** nút xuất tải lần lượt các trang lịch sử trong phạm vi đang chọn, tối đa **10.000 bản ghi**. Nếu vượt ngưỡng, ứng dụng báo lỗi và không tải file một phần. File chứa dữ liệu và khóa ảnh, không nhúng ảnh.
- Ô tìm kiếm chỉ lọc các dòng đã tải trên giao diện, **không lọc nội dung file xuất**. Thống kê cũng tính trên các dòng đã tải; dùng nút “Tải thêm” để xem thêm từng nhóm 100 bản ghi.

## Kết quả AI

Bảy trường chuỗi bắt buộc: disease, confidence, level, cause, solution, medicine, prevent. Backend từ chối null/chuỗi rỗng. Giới hạn ký tự: disease 1000, confidence/level 100, các trường khác 6000. Prompt yêu cầu mức Không có / Nhẹ / Trung bình / Nặng / Không xác định và confidence 0–100%; backend hiện chưa kiểm tra enum hoặc regex phần trăm riêng.

## Quota và đánh giá

Quota gồm allowed, used, remaining, limit, windowHours và resetAt. RPC recognition_quota và reserve_recognition nhận p_user_id UUID và p_is_admin boolean (mặc định false), chỉ service role được gọi.

Review nhận name 1–80 ký tự, star nguyên 1–5, content 1–2000 ký tự. UUID lấy từ phiên. Trigger database lấy email Auth tại thời điểm gửi, giữ nguyên khi sửa; dữ liệu cũ backfill theo email tại thời điểm migration. API chỉ trả user_email cho admin, kể cả admin xem phạm vi riêng.

Nguồn: [backend.js](../backend.js), [app.js](../public/app.js), [prompt.js](../prompt.js).
