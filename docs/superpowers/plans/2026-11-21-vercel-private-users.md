# Vercel private users implementation plan

Goal: Vercel Hobby + Supabase Free with email/password accounts, private history/images, admin read-all, 10 AI attempts per rolling 8h, validated input.
Architecture: Express serverless API, Supabase Auth verified via getUser, Postgres persistence, private Storage bucket. Service-role backend explicitly scopes every query. Browser SDK for sign-in only. No local SQLite/uploads in production.

- [x] SQL: history(user_id,image,result fields), reviews(user_id), recognition_usage, private bucket; RLS deny client mutations, service-role-only quota RPC with per-user advisory transaction lock. Admin IDs only server env. Schema and deployment instructions.
- [x] Backend: createApp injected service client; auth before upload; verified MIME/decode, max 3MiB image (Vercel 4.5MB default), private images via auth endpoint, auto-save detection, quota status /api/me, export own/all based on admin explicit scope; no client POST history. Export <=20 rows, thumbnails, response size guard.
- [x] Frontend: email/password sign-up/in/out/reset; authenticated requests; safe DOM text; private image blobs; quota; admin scope; preserve history/reviews/export interactions.
- [ ] Verify: cross-user access, admin scope, quota reject/no provider call, malicious content, invalid image, Excel; npm tests; docs for real cloud verification and deployment.

Interfaces: GET /api/config -> {supabaseUrl,supabaseAnonKey}; bearer Authorization on protected routes. GET /api/me -> {success,user:{id,email,isAdmin},quota:{used,limit:10,remaining,resetAt}}. GET history returns {success,data:[{id,user_id,image,disease,solution,level,result,created_at}]}; ?scope=all admin only. GET /api/history/:id/image returns bytes. POST /api/detect multipart image -> {success,image,historyId,result:JSON string}; server saves. Reviews CRUD own only; list own unless admin scope=all. POST history disabled. SQL RPC reserve_recognition(p_user_id uuid) and recognition_quota(p_user_id uuid) return JSON {allowed,used,remaining,resetAt}. Quota charged before AI, no refunds; invalid images rejected before quota.

Review focus: cross-user IDs and signed URLs, concurrent quota requests across instances, untrusted HTML and filenames, provider failure after quota consumption, Vercel payload limits and export memory. No cloud deployment claimed without actual service credentials and verification.

Local implementation and mock/DOM tests completed. External verification pending: run SQL/RLS/concurrency on Supabase test project, configure SMTP, Vercel build/deploy and real auth/AI tests. No deployment, commit or push performed for this change.
