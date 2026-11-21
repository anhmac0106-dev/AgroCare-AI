# Triển khai Vercel + Supabase

Phương án thử nghiệm: Vercel Hobby chạy Express và giao diện; Supabase Free chạy Auth, Postgres và Storage riêng tư. Không lưu database hoặc ảnh lâu dài trên filesystem của Vercel.

Website production: https://agro-care-ai-drab.vercel.app. Supabase đã chạy migration, Google OAuth đã liên kết và chuyển sang Production; xem phạm vi kiểm tra cuối tài liệu.

## 1. Điều kiện của gói miễn phí

- Vercel Hobby dành cho dự án cá nhân phi thương mại. Nếu ứng dụng phục vụ hoạt động thương mại, cần chọn gói phù hợp thay vì mặc định Hobby. Xem [Vercel Hobby](https://vercel.com/docs/plans/hobby) và [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines).
- Supabase Free hiện có 500 MB database, 1 GB file storage và có thể pause sau một tuần không hoạt động. Theo dõi usage trên dashboard; miễn phí không đồng nghĩa dung lượng vô hạn. Xem [Supabase Pricing](https://supabase.com/pricing).
- DeepSeek tính phí riêng. Hạn mức của ứng dụng là 10 lượt **mỗi tài khoản** trong 8 giờ gần nhất; nhiều tài khoản vẫn có thể tạo tổng chi phí lớn. Theo dõi và giới hạn ngân sách tại nhà cung cấp AI.
- Upload được giới hạn 3 MiB để nằm dưới giới hạn request mặc định 4,5 MB của Vercel Functions, có tính phần multipart. Không cần bật thử nghiệm request lớn. Xem [Vercel payload limit](https://vercel.com/docs/errors/function_payload_too_large).

## 2. Tạo Supabase project

1. Tạo project Free và lưu mật khẩu database bằng trình quản lý mật khẩu.
2. Chọn vùng gần người dùng, rồi lấy Project URL, anon/publishable key và service-role key trong dashboard.
3. Mở SQL Editor, chạy toàn bộ [migration](../supabase/migrations/202611210001_private_users.sql) **một lần trên project mới**. Nếu đã có bảng cùng tên, không xóa dữ liệu để chạy lại; cần đối chiếu schema và migration riêng.
4. Kiểm tra bảng `history`, `reviews`, `recognition_usage` có RLS bật và không có quyền trực tiếp cho `anon`/`authenticated`.
5. Kiểm tra bucket `plant-images` là **private**, giới hạn 3 MiB, nhận JPEG/PNG đã chuẩn hóa từ backend. Không thêm policy public hoặc cho browser upload trực tiếp.

API xác thực bearer token qua Supabase Auth. Backend dùng service-role key nên phải kiểm tra chủ sở hữu trên mọi truy vấn; RLS không thay thế kiểm tra này. Người dùng chỉ đọc/sửa dữ liệu của mình. Quản trị viên có thể chọn chế độ xem toàn bộ; quyền này được xác định từ biến môi trường phía server, không từ metadata do người dùng tự sửa.

## 3. Đăng nhập bằng Google

Theo yêu cầu mới, ứng dụng chỉ hiển thị đăng nhập Google. Không cần SMTP hoặc mật khẩu riêng.

1. Tạo Google Cloud project của chủ ứng dụng, cấu hình OAuth consent screen (Google Auth Platform) với audience External. Chỉ dùng thông tin cơ bản `openid`, `email`, `profile`, không xin quyền Gmail/Drive.
2. Tạo OAuth client loại Web application. Authorized JavaScript origin là `https://agro-care-ai-drab.vercel.app`. Authorized redirect URI là callback hiển thị trong Supabase Google provider: `https://PROJECT_REF.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Sign In / Providers → Google: bật provider, nhập Client ID và Client Secret. Secret chỉ lưu ở Supabase, không vào frontend/GitHub.
4. Đặt Site URL và Redirect URL Supabase là `https://agro-care-ai-drab.vercel.app`. Thêm origin localhost riêng khi phát triển; không allowlist wildcard rộng.
5. Tắt Email provider sau khi Google đã cấu hình. Giữ anonymous sign-in tắt.
6. Trong Google Auth Platform, chuyển audience từ Testing sang Production để người dùng ngoài danh sách test đăng nhập được; hoàn thành các yêu cầu xác minh nếu Google yêu cầu.
7. Kiểm tra Google redirect, đăng nhập lại sau refresh, đăng xuất, cách ly hai người dùng và quyền admin.

Supabase tự tạo Auth user khi người dùng đăng nhập Google lần đầu. UUID này tiếp tục là khóa phân quyền và quota. Không tự cấp admin bằng email/metadata.

Tài liệu: [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 4. Biến môi trường

Điền trong Vercel Project → Settings → Environment Variables. Dùng giá trị khác nhau cho Production và Preview nếu có thể; tránh để preview dùng dữ liệu thật.

| Biến | Giá trị | Công khai? |
| --- | --- | --- |
| `SUPABASE_URL` | URL project Supabase | Có |
| `SUPABASE_ANON_KEY` | anon/publishable key của project | Có, phục vụ đăng nhập |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key | **Không**, chỉ server |
| `DEEPSEEK_API_KEY` | API key DeepSeek | **Không**, chỉ server |
| `DEEPSEEK_MODEL` | `deepseek-flash` | Tên model |
| `ADMIN_USER_IDS` | UUID Auth của quản trị viên, phân tách bằng dấu phẩy | Chỉ server |

Không đưa service-role key vào frontend, file `.env.example`, commit, screenshot hoặc chat. `.env` chỉ dùng cục bộ và đã được ignore. Sau khi thay biến môi trường Vercel, tạo deployment mới để áp dụng.

Để chỉ định admin: đăng nhập Google lần đầu, mở Supabase Authentication → Users, lấy UUID của đúng tài khoản, thêm UUID đó vào `ADMIN_USER_IDS` và redeploy. Không dùng email hiển thị hoặc giá trị `user_metadata.isAdmin` để cấp quyền.

## 5. Triển khai trên Vercel

1. Kết nối GitHub với Vercel, chọn đúng repository AgroCare-AI và nhánh chứa thay đổi này.
2. Dùng cấu hình Express/`vercel.json` đi kèm repo; không khai báo thư mục output tĩnh chỉ chứa `public` và bỏ qua API.
3. Điền các biến môi trường ở trên. Chọn phiên bản Node.js được hỗ trợ và thỏa `engines` trong `package.json`.
4. Deploy và mở `/api/ping`; kiểm tra `/api/config` chỉ có Supabase URL và public key, tuyệt đối không có service-role/DeepSeek key.
5. Cập nhật Site URL và redirect allowlist Supabase thành URL deployment chính thức, rồi thử Auth end-to-end.
6. Xem logs khi lỗi; không ghi bearer token, mật khẩu, nội dung `.env` hoặc API keys vào logs.

Nếu Vercel không cho import repository do quyền Git integration, chủ repo cần cấp quyền truy cập repo cho ứng dụng Vercel hoặc tự import vào project của họ. Quyền collaborator GitHub không tự động đảm bảo mọi quyền trên Vercel.

## 6. Hạn mức nhận diện

- Cửa sổ trượt: luôn xét các lượt trong **8 giờ gần nhất**, không reset đồng loạt theo giờ cố định.
- Quota áp dụng cả admin. `resetAt` là thời điểm lượt cũ nhất còn trong cửa sổ hết hạn; khi đó có thêm một lượt, không nhất thiết hồi đủ 10 lượt.
- File sai hoặc quá lớn bị chặn trước khi gọi AI. Khi lượt đã được giữ chỗ để gọi AI, lỗi provider vẫn tiêu thụ lượt để tránh vòng retry làm phát sinh chi phí không giới hạn.
- RPC `reserve_recognition` khóa theo UUID người dùng trong Postgres, kiểm tra số lượt và ghi lượt mới trong cùng transaction. Không dùng biến đếm trong RAM của Vercel.
- Chỉ `service_role` được gọi quota RPC. Client không thể tự xóa, sửa usage hoặc gọi RPC cho người khác.
- Lượt hết hạn của một người dùng được dọn khi người đó nhận diện lần tiếp theo. Với nhiều tài khoản không hoạt động, có thể chạy tác vụ định kỳ quản trị để xóa usage cũ; không thay đổi quota đang có hiệu lực.

## 7. Kiểm tra bắt buộc trước khi mở public

Chạy `npm test` cục bộ. Các test dùng mock không chứng minh RLS và quota hoạt động trên Supabase thật, nên tiếp tục các bước bên dưới trên project thử nghiệm.

### SQL và cạnh tranh đồng thời

Cần `psql` và một tài khoản Auth test có UUID thật. Cấu hình kết nối qua `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (dùng thông tin kết nối dashboard, SSL phù hợp); không commit thông tin kết nối.

```sh
psql -v user_id=UUID_TAI_KHOAN_TEST -f supabase/tests/quota.sql
```

Script kiểm tra quyền RPC, quyền bảng, RLS, bucket private, 10 lượt đầu được nhận, lượt 11 bị từ chối, và cửa sổ hết hạn. Thay đổi của script nằm trong transaction được rollback.

Trên **project dùng riêng cho test**, kiểm tra đồng thời:

```powershell
$env:AGROCARE_DISPOSABLE_TEST = 'yes'
node supabase/tests/quota-concurrency.mjs UUID_TAI_KHOAN_TEST
```

Harness dùng 20 kết nối `psql` đồng thời, yêu cầu đúng 10 lượt thành công và 10 lượt bị từ chối. Nó **xóa quota của tài khoản test trước và sau khi chạy**, vì vậy không dùng tài khoản/dữ liệu production.

### Kiểm tra bằng hai người dùng và admin

1. Đăng nhập Google bằng A và B trên hai browser profile riêng.
2. A nhận diện, xem lịch sử và xuất Excel. B không thấy lịch sử/ảnh của A.
3. Dùng token B gọi URL ảnh của A, sửa/xóa đánh giá của A, hoặc yêu cầu `scope=all`: phải bị từ chối hoặc không trả dữ liệu.
4. Đăng xuất, gọi các API dữ liệu và ảnh không token: phải trả 401.
5. Admin xem được lịch sử toàn bộ qua chế độ quản trị; người dùng thường không tự cấp quyền bằng metadata/token giả.
6. Gửi đồng thời quá hạn mức: nhận 429, không gọi thêm DeepSeek. Trang hiển thị số lượt và thời gian có lượt lại.
7. Thử nội dung `<img src=x onerror=alert(1)>`, script và HTML trong đánh giá: không có JavaScript chạy. Thử file giả ảnh/ảnh quá lớn: bị chặn.
8. Xuất Excel từ tài khoản A và admin: ảnh đúng dòng, dữ liệu theo đúng scope; kiểm tra phản hồi khi vượt giới hạn xuất của API.
9. Restart/redeploy Vercel: lịch sử và ảnh vẫn còn trong Supabase.

## 8. Dữ liệu cũ, lưu trữ và vận hành

- SQLite và `uploads/` cũ vẫn ở máy phát triển nhưng không được tự đưa lên cloud. Dữ liệu cũ chưa có `user_id`; cần chỉ định người sở hữu từng bản ghi trước khi import, không gán toàn bộ thành dữ liệu công khai.
- Khi import có kiểm soát, chuẩn hóa ảnh, lưu vào bucket riêng tư theo người sở hữu, rồi ghi record với UUID Auth tương ứng. Sao lưu dữ liệu cũ trước khi thao tác.
- Xóa Auth user sẽ cascade các dòng trong database; Storage object không tự cascade. Cần quy trình dọn ảnh khi xóa tài khoản và kiểm tra object không còn được tham chiếu để tránh đầy 1 GB.
- Theo dõi Storage, database, egress và ngân sách DeepSeek. Khi vượt gói miễn phí, giới hạn tính năng hoặc nâng cấp theo quyết định của chủ dự án.
- Có kế hoạch backup/export database và object storage riêng. Gói miễn phí không được xem là cam kết uptime hay chiến lược backup đầy đủ.

## Trạng thái xác minh ngày 21/11/2026

- Vercel Hobby đã triển khai website, API và Supabase SDK. API riêng trả 401 khi không có phiên; `/api/config` chỉ trả URL và khóa công khai.
- Supabase Free: migration đã chạy; kiểm tra SQL thực tế đạt cho RLS, quyền bảng/RPC, bucket private, 10 lượt thành công, lượt thứ 11 bị từ chối và cửa sổ hết hạn sau 8 giờ. Dữ liệu test SQL được rollback.
- Google OAuth thuộc project `hybrid-flame-515415-n3` (AgroCare AI), quản lý qua tài khoản Google Cloud được chủ dự án chỉ định. Audience External, trạng thái In production; callback đúng Supabase. Chỉ dùng email/profile.
- Hai tài khoản Google đăng nhập thực tế thành công. Đã kiểm tra khôi phục phiên sau reload, tải quota 10/10, lịch sử/đánh giá và đăng xuất. Email provider tắt; không cần SMTP cho đăng nhập Google.
- Bộ test ứng dụng hiện có 17 test đạt (quyền sở hữu, giới hạn đầu vào, quota mock, Google login, XSS rendering, xuất Excel nhúng ảnh).
- Chưa xác minh lại nhận diện DeepSeek và xuất Excel bằng ảnh thật trên cloud, chưa chạy harness 20 kết nối Postgres đồng thời. Không coi những mục này đã đạt chỉ từ test mock.
