# Quy ước Live document

> Cập nhật: 22/11/2026 (Asia/Saigon). Áp dụng cho tài liệu trong repository AgroCare-AI.

## Mục tiêu và nguồn thông tin

Tài liệu phản ánh hiện trạng có thể tiếp tục công việc được, có nguồn đối chiếu và nêu rõ phần chưa xác minh. Đây là quy ước của dự án, không tuyên bố tuân thủ một chứng nhận bên ngoài.

| Tài liệu | Sở hữu thông tin |
| --- | --- |
| [README](../README.md) | Giới thiệu, bắt đầu nhanh, bản đồ tài liệu |
| [PROJECT_CONTEXT.MD](../PROJECT_CONTEXT.MD) | Mục tiêu, kiến trúc, quyết định đang áp dụng, bàn giao |
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | Cài đặt local và các lệnh phát triển |
| [API.md](API.md) | Endpoint, hợp đồng dữ liệu, giới hạn request/export |
| [DEPLOYMENT.md](DEPLOYMENT.md) | OAuth/env, thứ tự migration và triển khai |
| [OPERATIONS.md](OPERATIONS.md) | Admin, lưu trữ, khôi phục và xử lý sự cố |
| [VERIFICATION.md](VERIFICATION.md) | Bằng chứng kiểm tra, giới hạn và việc cần nghiệm thu |
| [Hồ sơ kế hoạch](superpowers/plans/2026-11-21-vercel-private-users.md) | Bối cảnh kế hoạch lịch sử, dẫn tới nguồn hiện hành |

Code, schema và cấu hình là nguồn đối chiếu hành vi; tài liệu không thay thế chúng. Mâu thuẫn phải được kiểm tra và sửa tại tài liệu sở hữu thông tin, sau đó cập nhật liên kết/bối cảnh cần thiết. Hạn chế chép lại cùng checklist hoặc số test ở nhiều nơi.

## Trách nhiệm và cách cập nhật

Chủ dự án quyết định yêu cầu sản phẩm. Người sửa code/schema/cấu hình có trách nhiệm cập nhật tài liệu liên quan trong cùng commit/PR; người tiếp nhận kiểm tra ngày, nguồn và giới hạn trước khi triển khai.

1. Khi thay hành vi, cập nhật API hoặc vận hành và tóm tắt quyết định trong PROJECT_CONTEXT.MD.
2. Khi thay env/OAuth/hosting/schema, cập nhật DEPLOYMENT.md, mẫu env khi cần và trạng thái migration. Migration cũ đã áp dụng không viết lại để giả lập lịch sử mới.
3. Khi thêm bằng chứng, cập nhật VERIFICATION.md với ngày, commit/deployment, môi trường và giới hạn; giữ mục chưa kiểm tra rõ ràng.
4. Khi đổi cấu trúc tài liệu, cập nhật bản đồ README và liên kết tương đối. README giữ gọn, không trở thành nhật ký hội thoại.
5. Trước kết thúc phiên, kiểm tra diff, liên kết nội bộ, ví dụ/lệnh, bí mật và tính nhất quán với code. Thay đổi tài liệu thuần túy không yêu cầu chạy lại toàn bộ test ứng dụng.

Không ghi khóa bí mật, bearer token, OAuth secret, mật khẩu hoặc nội dung .env vào tài liệu. Lịch sử thay đổi dùng Git; thông tin còn thiếu ghi rõ chưa xác minh, không suy diễn thành đã hoàn thành.
