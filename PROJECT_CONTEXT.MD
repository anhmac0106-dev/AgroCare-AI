# AgroCare AI — Project Context

> Live document · Cập nhật: 22/11/2026 (Asia/Saigon). Chủ dự án quyết định sản phẩm; người thay đổi code/cấu hình cập nhật tài liệu tương ứng trong cùng commit/PR.

## Mục đích và hiện trạng

Website tiếng Việt hỗ trợ nhận định sơ bộ tình trạng cây từ ảnh, lưu kết quả và xuất báo cáo. Production: [AgroCare AI](https://agro-care-ai-drab.vercel.app/). Repository: [anhmac0106-dev/AgroCare-AI](https://github.com/anhmac0106-dev/AgroCare-AI). Nhánh phát hành main tự deploy Vercel. Bản ứng dụng trước lần cập nhật tài liệu này: `61733b3`.

| Thành phần | Cấu hình đã ghi nhận |
| --- | --- |
| Runtime | Node.js 26.x, ESM, Express 4 |
| Hosting | Vercel Hobby; API và UI cùng origin |
| Dữ liệu | Supabase Free: Postgres, Auth, bucket plant-images private |
| AI | DeepSeek Chat Completions; DEEPSEEK_MODEL mặc định deepseek-flash |
| Đăng nhập | Google External/In production; Email provider và anonymous sign-in tắt; không dùng SMTP |
| Admin | anh.mac0106@gmail.com, cấp bằng UUID Auth trong ADMIN_USER_IDS production |
| Schema | Ba migration 001/002/003 đã áp dụng |

Đây là hiện trạng ghi nhận trong phiên, không phải kiểm tra lại dashboard mỗi lần sửa tài liệu. Không lưu khóa hoặc token trong tài liệu.

## Kiến trúc và luồng dữ liệu

1. Browser lấy URL/public key qua /api/config, đăng nhập Google qua Supabase Auth.
2. Request dữ liệu mang bearer token; backend gọi getUser, xác định admin từ UUID trong env.
3. sharp giải mã ảnh thật: tối đa 3 MiB/25 triệu pixel; chuẩn hóa JPEG trong khung 1600 × 1600.
4. Database giữ quota bằng advisory transaction lock theo user; backend gọi DeepSeek (timeout 120 giây), kiểm tra 7 trường JSON.
5. Lưu ảnh private theo UUID user/random UUID và history/result; browser đọc ảnh qua API có xác thực.
6. Frontend tự cập nhật dữ liệu sau thao tác và dùng textContent cho nội dung người dùng/AI.

Backend dùng service role nên phải giới hạn owner/scope trên mọi truy vấn. Bảng bật RLS, browser không đọc/ghi trực tiếp. Scope all chỉ dành cho admin và thao tác đọc; admin chỉ sửa/xóa dữ liệu của chính mình.

## Quyết định sản phẩm hiện hành

- Thường 10 lượt/8 giờ; admin 50 lượt/24 giờ gần nhất. Không reset nửa đêm. Xóa lịch sử không hoàn quota; lỗi AI sau reserve vẫn tính lượt. Usage quá 24 giờ được dọn theo user khi nhận diện tiếp.
- Email review lấy từ Auth tại lúc gửi, giữ nguyên khi sửa. Backfill cũ theo email lúc migration; API chỉ trả email cho admin.
- Prompt giữ 7 trường chuỗi; xử lý ảnh không xác định/cây khỏe và an toàn thuốc. Backend chưa kiểm tra enum mức độ hoặc regex confidence. Chưa có ô nhập mô tả ảnh.
- Excel nhúng ảnh: tối đa 20 dòng/request, 4 MiB. JSON phân trang tối đa 10.000 bản ghi. Tìm kiếm chỉ lọc màn hình, không lọc file xuất.
- UI dùng Be Vietnam Pro, logo/favicon 🌿, sáng/tối, contact chỉ Gmail. Dưới 768px nhóm thao tác lịch sử xếp dọc.
- Nút nhận diện: Nhận diện bằng AI → AI đang phân tích… + spinner → Hoàn thành. Ảnh mới/xóa đặt lại, lỗi cho retry. Đang phân tích khóa đổi/xóa ảnh. Nút Làm mới đã bỏ.

## Bản đồ mã nguồn

| File/thư mục | Trách nhiệm |
| --- | --- |
| server.js | Entry local/Vercel, Supabase client và env |
| backend.js | Auth, ownership, quota, kiểm tra input và API |
| deepseek.js / prompt.js | Request nhà cung cấp và chỉ dẫn AI |
| history-export.js | ExcelJS và thumbnail sharp |
| public/ | UI, auth/request, CSS, privacy và favicon |
| supabase/migrations/ | Schema, quota và trigger email |
| supabase/tests/ | Kiểm tra SQL và harness đồng thời |
| *.test.js | Node test, supertest, jsdom, Excel |
| .env.example / vercel.json | Mẫu biến và cấu hình triển khai |

## Kiểm chứng và việc còn lại

[VERIFICATION.md](docs/VERIFICATION.md) là nguồn kết quả kiểm tra: 24 test đạt gần nhất; SQL quota/email và OAuth đã kiểm tra trong phiên trước. Mobile mới kiểm tra viewport 390px, chưa thay thế điện thoại thật.

Còn nghiệm thu AI/Excel ảnh thật trên cloud hiện tại, kiểm tra xuyên tài khoản thật, harness đồng thời, chất lượng prompt thực địa và backup/restore. Không đánh dấu hoàn thành chỉ vì mock đạt.

## Khi tiếp tục công việc

Đọc tài liệu này rồi [API](docs/API.md), [triển khai](docs/DEPLOYMENT.md) hoặc [vận hành](docs/OPERATIONS.md). Giữ hợp đồng 7 trường và quyền riêng tư; thay schema phải thêm migration. SQLite/uploads local không dùng trên Vercel và không tự import.

Cập nhật tài liệu theo [quy ước Live document](docs/README.md). Lịch sử chi tiết dùng Git; không tích lũy nhật ký hội thoại trong README.
