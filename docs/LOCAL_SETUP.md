# Cài đặt và chạy cục bộ

> Live document · Cập nhật: 22/11/2026.

## Yêu cầu

- **Node.js 26.x** theo `engines` trong `package.json` trong repository; npm và Git.
- Project Supabase đã chạy migration, bật Google Auth và có bucket riêng tư.
- DeepSeek API key cho nhận diện. Các test mock không cần gọi DeepSeek thật.
- Internet để dùng Auth, Storage, AI và các CDN giao diện.

```sh
git clone https://github.com/anhmac0106-dev/AgroCare-AI.git
cd AgroCare-AI
npm ci
```

Tạo `.env` một lần, không ghi đè file cấu hình đã có khóa thật:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```sh
# macOS/Linux
cp .env.example .env
```

Điền cấu hình rồi chạy:

```sh
npm start
```

Mở [http://localhost:3000](http://localhost:3000), không mở trực tiếp file HTML. Frontend gọi API cùng origin, không còn cố định `localhost:3000` trong request.

| Lệnh | Công dụng |
| --- | --- |
| `npm ci` | Cài đúng dependency trong lockfile |
| `npm start` | Chạy server cục bộ |
| `npm run dev` | Chạy nodemon tự khởi động lại khi sửa code |
| `npm test` | Chạy bộ test Node.js |


Cấu hình biến môi trường xem [DEPLOYMENT.md](DEPLOYMENT.md#4-biến-môi-trường). Mẫu env ở [.env.example](../.env.example).

Để đăng nhập local, thêm http://localhost:3000 vào redirect allowlist Supabase và origin Google OAuth client. Thay cổng tương ứng nếu đổi PORT. Không mở file HTML trực tiếp.
