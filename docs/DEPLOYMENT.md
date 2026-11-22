# Triển khai Vercel + Supabase

> Live document · Cập nhật: 22/11/2026 (Asia/Saigon). Trạng thái kiểm chứng tập trung tại [VERIFICATION.md](VERIFICATION.md).

Production hiện chạy trên Vercel Hobby với Express/API và giao diện; Supabase Free cung cấp Auth, Postgres và Storage riêng tư. Không lưu database hoặc ảnh lâu dài trên filesystem của Vercel.

Website: [https://agro-care-ai-drab.vercel.app](https://agro-care-ai-drab.vercel.app). Nhánh `main` tự triển khai lên Vercel. Google OAuth ở chế độ Production. Cấu hình production được ghi nhận trong phiên triển khai; không kiểm tra lại dashboard chỉ vì cập nhật tài liệu.

## 1. Điều kiện của gói miễn phí

- Vercel Hobby dành cho dự án cá nhân phi thương mại. Nếu ứng dụng phục vụ hoạt động thương mại, cần chọn gói phù hợp thay vì mặc định Hobby. Xem [Vercel Hobby](https://vercel.com/docs/plans/hobby) và [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines).
- Supabase Free có giới hạn database, storage, egress và điều kiện pause. Kiểm tra quota/điều kiện hiện hành trên dashboard và trang nhà cung cấp trước khi quyết định dung lượng hoặc chi phí. Xem [Supabase Pricing](https://supabase.com/pricing).
- DeepSeek tính phí riêng. Hạn mức là 10 lượt/8 giờ cho người dùng, 50 lượt/24 giờ cho admin; nhiều tài khoản vẫn có thể tạo tổng chi phí lớn. Theo dõi và giới hạn ngân sách tại nhà cung cấp AI.
- Upload được giới hạn 3 MiB để nằm dưới giới hạn request mặc định 4,5 MB của Vercel Functions, có tính phần multipart. Không cần bật thử nghiệm request lớn. Xem [Vercel payload limit](https://vercel.com/docs/errors/function_payload_too_large).

## 2. Tạo Supabase project

1. Tạo project Free và lưu mật khẩu database bằng trình quản lý mật khẩu.
2. Chọn vùng gần người dùng, rồi lấy Project URL, anon/publishable key và service-role key trong dashboard.
3. Trên project mới, áp dụng migrations theo thứ tự: [001 schema/private data](../supabase/migrations/202611210001_private_users.sql), [002 quota 10/8h và 50/24h](../supabase/migrations/202611210002_admin_quota.sql), rồi [003 email đánh giá](../supabase/migrations/202611210003_review_email.sql). Project production đã chạy cả ba. Với project có dữ liệu, chỉ chạy migration chưa áp dụng; không chạy lại hoặc xóa bảng để làm theo hướng dẫn từ đầu.
4. Khi nâng backend cũ, phải triển khai backend có allowlist trường review an toàn **trước migration 003** để người dùng thường không nhận email. Migration 002 cần có trước backend dùng tham số quota admin. Không rollback về backend trả tất cả cột review sau khi đã có email.
5. Kiểm tra bảng `history`, `reviews`, `recognition_usage` có RLS bật và không có quyền trực tiếp cho `anon`/`authenticated`.
6. Kiểm tra bucket `plant-images` là **private**, giới hạn 3 MiB, nhận JPEG/PNG đã chuẩn hóa từ backend. Không thêm policy public hoặc cho browser upload trực tiếp.

API xác thực bearer token qua Supabase Auth. Backend dùng service-role key nên phải kiểm tra chủ sở hữu trên mọi truy vấn; RLS không thay thế kiểm tra này. Người dùng chỉ đọc/sửa dữ liệu của mình. Quản trị viên có thể chọn chế độ xem toàn bộ; quyền này được xác định từ biến môi trường phía server, không từ metadata do người dùng tự sửa.

## 3. Đăng nhập bằng Google

Ứng dụng production chỉ hiển thị đăng nhập Google. Email/password provider và anonymous sign-in tắt; không cần SMTP.

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
| `PORT` | Cổng local, mặc định 3000; không cần đặt trên Vercel | Có |
| `SUPABASE_URL` | URL project Supabase | Có |
| `SUPABASE_ANON_KEY` | anon/publishable key của project | Có, phục vụ đăng nhập |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role hoặc secret key | **Không**, chỉ server |
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

- Cửa sổ trượt: luôn xét các lượt trong **8 giờ gần nhất** với người dùng, **24 giờ gần nhất** với admin, không reset đồng loạt theo giờ cố định.
- Admin có hạn mức 50 lượt/24 giờ; người dùng có 10 lượt/8 giờ. `resetAt` là thời điểm lượt cũ nhất còn trong cửa sổ hết hạn; khi đó có thêm một lượt, không nhất thiết hồi đủ hạn mức.
- File sai hoặc quá lớn bị chặn trước khi gọi AI. Khi lượt đã được giữ chỗ để gọi AI, lỗi provider vẫn tiêu thụ lượt để tránh vòng retry làm phát sinh chi phí không giới hạn.
- RPC `reserve_recognition` khóa theo UUID người dùng trong Postgres, kiểm tra số lượt và ghi lượt mới trong cùng transaction. Không dùng biến đếm trong RAM của Vercel.
- Chỉ `service_role` được gọi quota RPC. Client không thể tự xóa, sửa usage hoặc gọi RPC cho người khác.
- Usage quá 24 giờ của người dùng được dọn khi người đó nhận diện tiếp; vẫn giữ cửa sổ 24 giờ cho user thường để tính đúng khi nâng quyền. Với nhiều tài khoản không hoạt động, có thể chạy tác vụ định kỳ quản trị để xóa usage cũ; không thay đổi quota đang có hiệu lực.

## 7. Kiểm thử và nghiệm thu

Chạy `npm test` cục bộ sau mỗi thay đổi. Test ứng dụng mock không thay thế kiểm tra database, Google OAuth, DeepSeek hoặc file thật. Các thao tác kiểm tra SQL dùng transaction/rollback. Harness concurrency xóa usage tài khoản kiểm tra, nên chỉ chạy trong project dùng riêng cho test.

### SQL và cạnh tranh đồng thời

Cần `psql` và một tài khoản Auth test có UUID thật. Cấu hình kết nối qua `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` (dùng thông tin kết nối dashboard, SSL phù hợp); không commit thông tin kết nối.

```sh
psql -v user_id=UUID_TAI_KHOAN_TEST -f supabase/tests/quota.sql
```

Script kiểm tra quyền RPC/bảng, RLS, bucket private, người dùng 10/8h, admin 50/24h, đổi vai trò và hết hạn cửa sổ. Thay đổi nằm trong transaction rollback. Có thể chạy thêm `psql -f supabase/tests/review-email.sql` sau migration 003 để kiểm tra email lấy từ Auth, không giả mạo được và browser không có quyền đọc database.

Trên **project dùng riêng cho test**, kiểm tra đồng thời:

```powershell
$env:AGROCARE_DISPOSABLE_TEST = 'yes'
node supabase/tests/quota-concurrency.mjs UUID_TAI_KHOAN_TEST
```

Harness dùng 20 kết nối `psql` đồng thời, yêu cầu đúng 10 lượt người dùng thành công và 10 lượt bị từ chối. Nó **xóa quota của tài khoản test trước và sau khi chạy**, vì vậy không dùng tài khoản/dữ liệu production.

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

## Trạng thái hiện tại

Production đã áp dụng ba migration; các kiểm tra OAuth, quota, email và giao diện đã ghi nhận tại [VERIFICATION.md](VERIFICATION.md). Tài liệu đó là nguồn cập nhật kết quả test và việc còn nghiệm thu.

## Tài liệu liên quan

- [README](../README.md) và [cài đặt cục bộ](LOCAL_SETUP.md)
- [Kiểm tra quota SQL](../supabase/tests/quota.sql)
- [Kiểm tra Gmail đánh giá](../supabase/tests/review-email.sql)
- Các migration: [001](../supabase/migrations/202611210001_private_users.sql), [002](../supabase/migrations/202611210002_admin_quota.sql), [003](../supabase/migrations/202611210003_review_email.sql).
