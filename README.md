# AgroCare AI

Ứng dụng web tiếng Việt phân tích ảnh cây trồng bằng DeepSeek, lưu lịch sử riêng theo tài khoản và xuất Excel có ảnh. Phiên bản này được chuẩn bị cho **Vercel + Supabase**: Express chạy API, Supabase cung cấp đăng nhập Google, Postgres và kho ảnh riêng tư.

Website: https://agro-care-ai-drab.vercel.app. Cấu hình Google OAuth và kiểm tra đăng nhập thực tế theo [hướng dẫn triển khai](docs/DEPLOYMENT.md) trước khi mở sử dụng rộng rãi.

## Chức năng

- Đăng nhập bằng Google và đăng xuất qua Supabase Auth; không cần mật khẩu ứng dụng hay SMTP.
- Chọn hoặc kéo thả ảnh để nhận diện; xem tên bệnh, độ tin cậy do AI trả về, mức độ, nguyên nhân, hướng xử lý và cách phòng tránh.
- Mỗi tài khoản có tối đa **10 lượt nhận diện trong 8 giờ gần nhất**. Hạn mức được lưu và kiểm tra trong database, không phụ thuộc một phiên server.
- Lịch sử và ảnh riêng theo người dùng. Quản trị viên có chế độ **xem toàn bộ**, không có quyền sửa/xóa dữ liệu của người khác qua API ứng dụng.
- Tìm kiếm lịch sử, xem ảnh bằng API có xác thực, xuất JSON và Excel nhúng ảnh đúng dòng.
- Tạo, xem, sửa, xóa đánh giá của chính mình; admin có thể xem đánh giá toàn bộ.
- Kiểm tra đầu vào ở backend, giải mã ảnh thật trước khi gửi AI, giới hạn kích thước và hiển thị nội dung người dùng/AI bằng text để tránh thực thi HTML.
- Giao diện sáng/tối.

## Yêu cầu và cài đặt

- **Node.js 26.x** theo `engines` trong `package.json` và cấu hình Vercel, npm và Git. Môi trường kiểm tra cục bộ dùng Node.js 26.13.0.
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

## Cấu hình

```dotenv
PORT=3000
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-flash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_USER_IDS=
```

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Cổng chạy cục bộ, mặc định 3000 |
| `DEEPSEEK_API_KEY` | Khóa bí mật, chỉ dùng ở backend |
| `DEEPSEEK_MODEL` | Mặc định `deepseek-flash` |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_ANON_KEY` | Public key phục vụ client đăng nhập |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa đặc quyền, **tuyệt đối không đưa vào frontend hoặc Git** |
| `ADMIN_USER_IDS` | UUID Supabase Auth của admin, phân tách bằng dấu phẩy; trống là không có admin |

Quyền admin do server xác định từ `ADMIN_USER_IDS`, không nhận từ form hoặc metadata người dùng. Khóa thật nằm trong `.env` cục bộ hoặc Vercel Environment Variables; `.env.example` chỉ chứa mẫu trống.

## Chuẩn bị Supabase và Vercel

1. Tạo project Supabase mới và chạy [SQL migration](supabase/migrations/202611210001_private_users.sql).
2. Bật Email Auth, giữ xác nhận email và cấu hình Custom SMTP. SMTP mặc định Supabase chỉ gửi đến email thuộc nhóm project, không phù hợp mở đăng ký đại trà.
3. Tạo deployment Vercel từ GitHub với `vercel.json` đi kèm, điền biến môi trường.
4. Cập nhật Site URL và redirect allowlist trong Supabase bằng URL chính thức.
5. Đăng ký tài khoản admin, lấy UUID Auth và thêm vào `ADMIN_USER_IDS`, rồi redeploy.
6. Kiểm tra bằng ít nhất hai tài khoản thường và một admin trước khi mở public.

Các bước cụ thể, điều kiện gói miễn phí, SMTP, SQL test và nghiệm thu nằm trong [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Vercel Hobby chỉ phù hợp mục đích cá nhân phi thương mại; Supabase Free có giới hạn và có thể pause khi không hoạt động. **Phí DeepSeek vẫn tính riêng.**

## Quy tắc nhận diện và hạn mức

- JPEG, PNG, GIF, WebP; tối đa **3 MiB**, tối đa **25 triệu pixel**.
- Backend đọc nội dung ảnh thực, chuẩn hóa thành JPEG và thu nhỏ trước khi gửi DeepSeek/lưu Storage.
- Ảnh sai bị chặn trước khi giữ lượt. Khi bắt đầu gọi AI, lượt đã tính; lỗi AI vẫn tiêu thụ lượt để tránh retry không giới hạn.
- Quota là cửa sổ trượt 8 giờ, áp dụng cả admin. `resetAt` là thời điểm lượt cũ nhất hết hạn, không phải thời điểm hồi đồng loạt đủ 10 lượt.
- SQL dùng khóa transaction theo user để chặn vượt hạn mức khi gửi nhiều request đồng thời qua các instance Vercel.
- Thành công: backend **tự lưu lịch sử**, sau đó trả kết quả. Client không gọi `POST /api/history` để ghi kết quả tùy ý.

Ảnh lưu trong bucket `plant-images` riêng tư. Browser tải ảnh qua endpoint có bearer token, không dùng public bucket hoặc URL công khai. Admin chỉ được đọc ảnh sau khi server xác định quyền.

## API

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

Mỗi request xuất tối đa **20 dòng**; workbook vượt **4 MiB** bị từ chối để phù hợp giới hạn phản hồi của Vercel. JSON là dữ liệu lịch sử đã tải, không kèm file ảnh. Tìm kiếm và thống kê giao diện chỉ phản ánh các dòng đang tải, không phải truy vấn toàn bộ dữ liệu trên server.

## Cấu trúc mã nguồn

```text
server.js                         # Entry point local/Vercel, cấu hình Supabase
backend.js                        # createApp, auth, scope, validation, quota và API
public/index.html                 # Giao diện và form tài khoản
public/app.js                     # Auth, request có token, DOM an toàn, lịch sử
public/style.css                  # Kiểu dáng
supabase/migrations/               # Schema, RLS, bucket và quota RPC
supabase/tests/                    # Test SQL/quota đồng thời cần Postgres thật
history-export.js                 # Excel và thumbnail nhúng
prompt.js                         # Prompt phân tích ảnh
deepseek.js                       # DeepSeek client
*.test.js                         # Test ứng dụng
vercel.json                       # Cấu hình triển khai
.env.example                      # Mẫu biến môi trường
```

## Kiểm thử

```sh
npm test
```

Các test ứng dụng dùng mock cho dịch vụ bên ngoài, kiểm tra API xác thực/phân quyền, nhận diện/quota, xử lý nội dung, frontend và Excel. Không cần khóa AI thật cho test mock.

**SQL chưa được chứng minh bằng test mock.** Chạy `supabase/tests/quota.sql` và `quota-concurrency.mjs` theo [hướng dẫn kiểm tra](docs/DEPLOYMENT.md#7-kiểm-tra-bắt-buộc-trước-khi-mở-public) trên project Supabase thử nghiệm. Cần xác nhận 20 request đồng thời chỉ nhận đúng 10 lượt, RLS/private bucket có hiệu lực và người B không truy cập được dữ liệu của người A.

## Dữ liệu cũ và vận hành

SQLite `database/agrocare.db` và ảnh trong `uploads/` của bản cũ không còn được API cloud sử dụng. Chúng vẫn có thể tồn tại trên máy, được ignore bởi Git và **không tự import lên Supabase**. Sao lưu cả database lẫn uploads trước khi chuyển dữ liệu; phải xác định UUID chủ sở hữu từng bản ghi trước khi import. Không tự gán lịch sử cũ thành dữ liệu chung.

Supabase lưu lịch sử đầy đủ dưới `history`, đánh giá dưới `reviews` và lượt sử dụng dưới `recognition_usage`. Các bảng bật RLS, không cho browser đọc/ghi trực tiếp; backend dùng service-role phải luôn kiểm tra user/scope. Theo dõi dung lượng Storage/database và ngân sách AI. Xóa tài khoản cần dọn object Storage riêng, vì database cascade không tự xóa file ảnh.

## Xử lý sự cố

| Hiện tượng | Kiểm tra |
| --- | --- |
| “Chưa cấu hình Supabase” | Kiểm tra URL, public key, service-role key và redeploy/restart |
| Không nhận email xác nhận/reset | Custom SMTP, domain gửi email, redirect allowlist và Auth rate limits |
| 401 | Đăng nhập lại, kiểm tra token có thuộc đúng Supabase project |
| 403 khi xem toàn bộ | UUID tài khoản phải có trong `ADMIN_USER_IDS` ở server |
| 429 | Đã dùng 10 lượt/8h; chờ thời điểm `resetAt` |
| 400 khi upload | Ảnh đúng định dạng, <=3 MiB, <=25 triệu pixel |
| Lỗi database hoặc bucket | Migration đã chạy trên đúng project, bucket private tồn tại |
| Excel thiếu ảnh | Kiểm tra object còn tồn tại và khóa ảnh thuộc đúng chủ sở hữu |
| Dữ liệu biến mất khi đăng nhập tài khoản khác | Đây là phân tách dữ liệu riêng theo user; admin dùng chế độ xem toàn bộ |

## Thông tin dự án

Tác giả khai báo trong `package.json`: **Mac Bao Anh**. Trường `license` hiện là `MIT`; repository chưa có file `LICENSE` riêng. Kết quả và độ tin cậy do AI sinh ra chưa phải chỉ số được đánh giá trên tập dữ liệu của dự án.
