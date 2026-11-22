# 🌿 AgroCare AI

Ứng dụng tiếng Việt phân tích ảnh cây trồng bằng DeepSeek, lưu lịch sử riêng theo tài khoản và xuất Excel có ảnh.

**Website:** [AgroCare AI](https://agro-care-ai-drab.vercel.app/) · **Tài liệu cập nhật:** 22/11/2026

## Chức năng

- Đăng nhập Google; lịch sử và ảnh riêng theo người dùng.
- Phân tích bệnh, mức độ, nguyên nhân, xử lý và phòng tránh; nút hiển thị tiến trình và hoàn thành.
- Người dùng **10 lượt/8 giờ**; admin **50 lượt/24 giờ**, theo cửa sổ trượt.
- Excel nhúng ảnh, JSON; đánh giá lưu Gmail chỉ cho admin xem.
- Giao diện điện thoại, sáng/tối, font tiếng Việt Be Vietnam Pro.

## Bắt đầu

Yêu cầu **Node.js 26.x** và npm. Cài dependencies bằng `npm ci`, tạo `.env` từ [.env.example](.env.example) nếu chưa có và điền cấu hình Supabase/DeepSeek. Chạy `npm start`, mở [localhost:3000](http://localhost:3000).

Xem [hướng dẫn cài đặt cục bộ](docs/LOCAL_SETUP.md) cho các bước đầy đủ. Khóa bí mật lưu trong env, không commit.

| Lệnh | Công dụng |
| --- | --- |
| `npm start` | Chạy Express/API và giao diện |
| `npm run dev` | Chạy với nodemon |
| `npm test` | Test ứng dụng cục bộ |

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [PROJECT_CONTEXT.MD](PROJECT_CONTEXT.MD) | Bối cảnh, kiến trúc, quyết định và việc còn lại |
| [Cài đặt](docs/LOCAL_SETUP.md) | Chạy local |
| [Triển khai](docs/DEPLOYMENT.md) | Môi trường, OAuth, cấu hình và migration |
| [API](docs/API.md) | Endpoint, hợp đồng AI/review/quota và xuất dữ liệu |
| [Vận hành](docs/OPERATIONS.md) | Admin, dữ liệu, khôi phục và xử lý sự cố |
| [Kiểm chứng](docs/VERIFICATION.md) | Kết quả ghi nhận và phần chưa nghiệm thu |
| [Live document](docs/README.md) | Nguồn thông tin và quy trình duy trì tài liệu |

Production dùng **Vercel + Supabase**; DeepSeek tính phí riêng. Kết quả AI là nhận định sơ bộ từ ảnh. Bộ test gần nhất có **24 bài đạt**; phạm vi cloud xem tài liệu kiểm chứng.

Tác giả trong package: **Mac Bao Anh**. Package khai báo MIT; repository hiện chưa có file LICENSE riêng.
