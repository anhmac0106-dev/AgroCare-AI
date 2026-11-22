# Trạng thái kiểm chứng và nghiệm thu

> Live document · Cập nhật: 22/11/2026 (Asia/Saigon). Đây là nơi ghi bằng chứng kiểm tra; ngày là thời điểm quan sát, không phải cam kết dịch vụ luôn hoạt động sau đó.

| Phạm vi | Bằng chứng đã ghi nhận | Thời điểm và giới hạn |
| --- | --- | --- |
| Test ứng dụng | npm test: 24 bài đạt tại commit 61733b3 | 22/11/2026; mock Supabase/AI, DOM và Excel cục bộ |
| OAuth | Hai tài khoản Google đăng nhập, refresh phiên và đăng xuất thành công | 21/11/2026; Email provider và anonymous sign-in tắt |
| Quota production | Thường 10/8h chặn lượt 11, admin 50/24h chặn lượt 51; hết hạn và giữ usage khi nâng quyền | 21/11/2026; SQL tuần tự, dữ liệu thử rollback |
| Quyền database | RLS, ACL bảng/RPC và private bucket đã kiểm tra | 21/11/2026; không thay thế test xuyên tài khoản với dữ liệu thật |
| Email review | SQL chống email giả mạo, giữ snapshot khi sửa; admin xem được Gmail trên UI production | 21/11/2026; API loại email khỏi phản hồi thường có test mock |
| Prompt | Backend nhận 5 mức độ, UI không đếm cây khỏe/không xác định vào bệnh nhẹ/nặng | 21/11/2026; dữ liệu giả lập, chưa đo chất lượng chẩn đoán |
| Mobile | Nhóm tìm kiếm/xuất/xóa lịch sử nằm trong khung ở viewport 390 × 844 | 22/11/2026; desktop giả lập kích thước, chưa nghiệm thu Safari/Android thật |
| Font | Be Vietnam Pro tải được; tiêu đề/nút/input và trang riêng tư cùng font | 22/11/2026; phụ thuộc Google Fonts, có system font fallback |
| Nút nhận diện | Test trạng thái chờ/spinner, hoàn thành, ảnh mới reset và lỗi cho retry | 22/11/2026; mock API, chưa quan sát gọi AI thật |
| UI production | Asset đã xác nhận font mới, contact chỉ Gmail và bỏ nút Làm mới | 22/11/2026; kiểm tra asset không thay thế toàn luồng |

## Chưa nghiệm thu đầy đủ

- Nhận diện và Excel với ảnh thật trên phiên bản cloud hiện tại: ảnh đúng dòng, đúng scope.
- Harness 20 kết nối Postgres đồng thời trên project riêng; bổ sung kiểm tra cạnh tranh admin nếu cần.
- Dùng A/B thật kiểm tra URL ảnh, sửa/xóa đánh giá và export với dữ liệu thật; phản hồi thường không có Gmail.
- Điện thoại thật, chế độ tối, mạng chậm, ảnh lớn, lỗi nhà cung cấp và tiến trình trong toàn luồng.
- Prompt trên tập ảnh thực địa, độ tin cậy và đề xuất hoạt chất theo nhãn đăng ký.
- Backup/restore thử nghiệm, giám sát dung lượng/ngân sách và tác vụ dọn dữ liệu tự động.

## Cách kiểm tra lại

- Ứng dụng: npm test, không cần gọi AI thật.
- SQL: [quota.sql](../supabase/tests/quota.sql), [review-email.sql](../supabase/tests/review-email.sql), [quota-concurrency.mjs](../supabase/tests/quota-concurrency.mjs).
- Lệnh và checklist cloud: [DEPLOYMENT.md](DEPLOYMENT.md#7-kiểm-thử-và-nghiệm-thu). Harness đồng thời xóa usage test nên chỉ chạy trên project riêng.
- Khi có bằng chứng mới, cập nhật ngày, commit/deployment, môi trường, kết quả và giới hạn. Không nâng trạng thái cloud dựa trên mock.
