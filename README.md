# AgroCare AI

Ứng dụng web tiếng Việt phân tích ảnh cây trồng bằng DeepSeek, lưu lịch sử riêng theo tài khoản và xuất Excel có ảnh. Ứng dụng đang được triển khai trên **Vercel + Supabase**: Express chạy API, Supabase cung cấp đăng nhập Google, Postgres và kho ảnh riêng tư.

Website: [agro-care-ai-drab.vercel.app](https://agro-care-ai-drab.vercel.app).

## Hiện trạng triển khai — 21/11/2026

| Thành phần | Hiện trạng |
| --- | --- |
| Hosting | Vercel Hobby, triển khai tự động từ nhánh `main` trên GitHub |
| Dữ liệu | Supabase Free: Postgres và bucket ảnh `plant-images` riêng tư |
| Đăng nhập | Google OAuth qua Supabase Auth; Google audience External, In production; Email provider và đăng nhập ẩn danh tắt |
| AI | Backend gọi DeepSeek; model cấu hình hiện tại là `deepseek-flash` |
| Quản trị | `anh.mac0106@gmail.com`, cấp quyền bằng UUID trong `ADMIN_USER_IDS` của môi trường Production |
| Hạn mức | Người dùng: **10 lượt/8 giờ**; quản trị viên: **50 lượt/24 giờ**, tính theo cửa sổ trượt |
| Database | Đã áp dụng ba migration trong `supabase/migrations/` |

Xem [hướng dẫn triển khai](docs/DEPLOYMENT.md) để biết chi tiết vận hành. Phạm vi đã kiểm chứng và các bước còn cần nghiệm thu được ghi ở mục **Kiểm thử** bên dưới.

## Chức năng

- Đăng nhập bằng Google và đăng xuất qua Supabase Auth; không cần mật khẩu ứng dụng hay SMTP.
- Chọn hoặc kéo thả ảnh để nhận diện; xem tên bệnh, độ tin cậy do AI trả về, mức độ, nguyên nhân, hướng xử lý và cách phòng tránh.
- Người dùng có **10 lượt nhận diện trong 8 giờ gần nhất**; quản trị viên có **50 lượt trong 24 giờ gần nhất**. Hạn mức được lưu và kiểm tra trong database, không phụ thuộc một phiên server.
- Lịch sử và ảnh riêng theo người dùng. Quản trị viên có chế độ **xem toàn bộ**, không có quyền sửa/xóa dữ liệu của người khác qua API ứng dụng.
- Tìm kiếm lịch sử, xem ảnh bằng API có xác thực, xuất JSON và Excel nhúng ảnh đúng dòng.
- Tạo, xem, sửa, xóa đánh giá của chính mình; admin có thể xem đánh giá toàn bộ.
- Kiểm tra đầu vào ở backend, giải mã ảnh thật trước khi gửi AI, giới hạn kích thước và hiển thị nội dung người dùng/AI bằng text để tránh thực thi HTML.
- Giao diện sáng/tối.

## Lưu và xem đánh giá

Sau khi đăng nhập, người dùng điền tên, số sao và nội dung rồi chọn **Gửi đánh giá**. Backend lưu vào bảng `reviews` trên Supabase, gắn với UUID của phiên đăng nhập; database tự lưu email của tài khoản xác thực tại thời điểm gửi. Chỉ admin được API trả email và xem dòng **Gmail đăng nhập**. Email không lấy từ form; sửa đánh giá không thay đổi email đã lưu; đánh giá được giữ sau khi tải lại trang hoặc triển khai lại website.

Quản trị viên đăng nhập, vào phần **Tài khoản AgroCare AI** ở đầu trang và bật **Quản trị: xem lịch sử và đánh giá của tất cả người dùng (chỉ đọc)**. Phần **Đánh giá từ người dùng** sẽ hiển thị đánh giá của mọi tài khoản, mới nhất trước. Chọn **Tải thêm 100 bản ghi** nếu còn dữ liệu. Admin chỉ được sửa/xóa đánh giá do chính mình tạo; người dùng thường chỉ xem đánh giá của mình.

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
| `SUPABASE_ANON_KEY` | Anon hoặc publishable key phục vụ client đăng nhập |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role hoặc secret key dùng ở server, **tuyệt đối không đưa vào frontend hoặc Git** |
| `ADMIN_USER_IDS` | UUID Supabase Auth của admin, phân tách bằng dấu phẩy; trống là không có admin |

Quyền admin do server xác định từ `ADMIN_USER_IDS`, không nhận từ form hoặc metadata người dùng. Khóa thật nằm trong `.env` cục bộ hoặc Vercel Environment Variables; `.env.example` chỉ chứa mẫu trống.

## Chuẩn bị Supabase và Vercel

Các bước dưới đây dùng cho môi trường mới; website production đã được cấu hình.

1. Tạo project Supabase và chạy lần lượt:

   - [202611210001_private_users.sql](supabase/migrations/202611210001_private_users.sql): bảng dữ liệu, RLS, bucket ảnh riêng tư và quota ban đầu.
   - [202611210002_admin_quota.sql](supabase/migrations/202611210002_admin_quota.sql): người dùng 10 lượt/8 giờ, admin 50 lượt/24 giờ.

   Với project đã chạy migration đầu, chỉ áp dụng migration thứ hai **trước khi deploy backend mới**. Không chạy lại migration đã áp dụng.
   Sau khi backend có danh sách trường phản hồi an toàn cho người dùng thường đã được triển khai, chạy [202611210003_review_email.sql](supabase/migrations/202611210003_review_email.sql). Migration bổ sung email cho đánh giá cũ từ tài khoản Auth hiện tại và tự lưu email cho đánh giá mới. Không chạy migration này với backend cũ trả toàn bộ cột cho người dùng thường.

2. Tạo Google OAuth client loại **Web application**, audience **External**. Đặt origin là URL website và redirect URI là `https://PROJECT_REF.supabase.co/auth/v1/callback`. Chuyển audience sang **Production** để người ngoài danh sách test đăng nhập được.
3. Bật Google provider trong Supabase Auth, nhập Client ID và Client Secret. Secret chỉ lưu tại Supabase. Tắt Email provider và anonymous sign-in; ứng dụng không cần SMTP.
4. Kết nối repository GitHub với Vercel, dùng nhánh `main`, Node.js 26.x và `vercel.json` đi kèm. Điền biến môi trường; Express phục vụ cả API và giao diện, không chỉ deploy thư mục `public/`.
5. Trong Supabase Auth, đặt **Site URL** và **Redirect URLs** theo URL website. Khi phát triển cục bộ, thêm `http://localhost:3000` vào redirect allowlist và origin của Google OAuth client; thay cổng tương ứng nếu đổi `PORT`.
6. Đăng nhập Google lần đầu để tạo Auth user. Lấy UUID của tài khoản quản trị trong Supabase Authentication → Users, thêm vào `ADMIN_USER_IDS` trên Vercel rồi redeploy. Email hoặc metadata do người dùng gửi không thể tự cấp quyền admin.
7. Kiểm tra đăng nhập, quyền riêng tư, nhận diện và xuất báo cáo theo mục **Kiểm thử**. Sau khi thay biến môi trường Vercel, phải tạo deployment mới để áp dụng.

Vercel và Supabase đang dùng gói miễn phí; **DeepSeek tính phí riêng**. Theo dõi usage và điều kiện sử dụng gói tại dashboard của từng nhà cung cấp; hạn mức ứng dụng áp dụng theo tài khoản, không phải giới hạn tổng chi phí AI.

## Quy tắc nhận diện và hạn mức

- JPEG, PNG, GIF, WebP; tối đa **3 MiB**, tối đa **25 triệu pixel**.
- Backend đọc nội dung ảnh thực, chuẩn hóa thành JPEG và thu nhỏ trong khung 1600 × 1600 pixel (không phóng lớn) trước khi gửi DeepSeek/lưu Storage.
- Ảnh sai bị chặn trước khi giữ lượt. Khi bắt đầu gọi AI, lượt đã tính; lỗi AI vẫn tiêu thụ lượt để tránh retry không giới hạn.
- Quota là cửa sổ trượt: người dùng 10 lượt/8 giờ, admin 50 lượt/24 giờ. `resetAt` là thời điểm lượt cũ nhất hết hạn, không phải thời điểm hồi đồng loạt toàn bộ hạn mức. Không reset theo nửa đêm.
- Khi nhận diện, database dọn usage quá 24 giờ của tài khoản đó; các lượt trong 24 giờ được giữ lại kể cả với người dùng thường để tính đúng khi nâng quyền admin. Xóa lịch sử không hoàn lại quota.
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

- **Excel:** nút xuất lấy tối đa **20 lần phân tích gần nhất** trong phạm vi tài khoản hoặc chế độ admin đang chọn. API hỗ trợ `offset` để xuất các nhóm tiếp theo. Workbook vượt **4 MiB** bị từ chối.
- **JSON:** nút xuất tải lần lượt các trang lịch sử trong phạm vi đang chọn, tối đa **10.000 bản ghi**. Nếu vượt ngưỡng, ứng dụng báo lỗi và không tải file một phần. File chứa dữ liệu và khóa ảnh, không nhúng ảnh.
- Ô tìm kiếm chỉ lọc các dòng đã tải trên giao diện, **không lọc nội dung file xuất**. Thống kê cũng tính trên các dòng đã tải; dùng nút “Tải thêm” để xem thêm từng nhóm 100 bản ghi.

## Cấu trúc mã nguồn

```text
server.js                         # Entry point local/Vercel, cấu hình Supabase
backend.js                        # createApp, auth, scope, validation, quota và API
public/index.html                 # Giao diện và form tài khoản
public/app.js                     # Auth, request có token, DOM an toàn, lịch sử
public/style.css                  # Kiểu dáng
public/privacy.html               # Thông tin quyền riêng tư
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

Trạng thái xác minh gần nhất ngày **21/11/2026**:

- **20 test ứng dụng đạt**: xác thực, quyền sở hữu, admin, quota, đầu vào, Google login, hiển thị nội dung an toàn và Excel nhúng ảnh. Đây là test dùng mock, không phải kiểm tra DeepSeek thật.
- Google login đã kiểm tra với hai tài khoản trên website, gồm khôi phục phiên sau reload và đăng xuất. Tài khoản quản trị đã hiển thị **50/50 lượt trong 24 giờ gần nhất** sau triển khai.
- Kiểm tra SQL thực tế đã đạt: người dùng chặn lượt 11; admin chặn lượt 51; cửa sổ 8/24 giờ hết hạn đúng; giữ lượt gần đây khi đổi vai trò; RPC không mở trực tiếp cho browser. Kiểm tra RLS, quyền bảng và bucket private cũng đã thực hiện. Dữ liệu kiểm tra được rollback.
- **Chưa xác minh lại nhận diện DeepSeek và xuất Excel với ảnh thật trên cloud; chưa chạy harness 20 kết nối Postgres đồng thời.** Không xem các mục này đã đạt chỉ từ test mock hoặc SQL tuần tự.

Để kiểm tra database trên môi trường thử nghiệm, chạy `supabase/tests/quota.sql` và `quota-concurrency.mjs` theo [hướng dẫn kiểm tra](docs/DEPLOYMENT.md#7-kiểm-tra-bắt-buộc-trước-khi-mở-public) trên project Supabase thử nghiệm. Script SQL kiểm tra cả hai hạn mức và quyền database. Harness đồng thời dùng 20 request của tài khoản thường, yêu cầu chỉ nhận đúng 10 lượt. Khi nghiệm thu bằng ảnh thật, cần xác nhận người B không xem được lịch sử/ảnh của người A.

## Dữ liệu cũ và vận hành

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

## Thông tin dự án

Tác giả khai báo trong `package.json`: **Mac Bao Anh**. Trường `license` hiện là `MIT`; repository chưa có file `LICENSE` riêng. Kết quả và độ tin cậy do AI sinh ra chưa phải chỉ số được đánh giá trên tập dữ liệu của dự án.
