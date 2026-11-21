-- Run against a disposable Supabase project as postgres with an existing test
-- Auth user UUID: psql "$DATABASE_URL" -v user_id=UUID -f supabase/tests/quota.sql
-- Every mutation in this script is rolled back.
\set ON_ERROR_STOP on
begin;
select set_config('test.user_id', :'user_id', true);
delete from public.recognition_usage where user_id = current_setting('test.user_id')::uuid;
do $$
declare
  u uuid := current_setting('test.user_id')::uuid;
  q jsonb;
begin
  if has_function_privilege('anon', 'public.reserve_recognition(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.reserve_recognition(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.recognition_quota(uuid)', 'EXECUTE')
  then raise exception 'Quota RPC exposed to browser'; end if;
  if has_table_privilege('anon','public.history','SELECT')
     or has_table_privilege('authenticated','public.history','INSERT')
     or has_table_privilege('authenticated','public.recognition_usage','DELETE')
  then raise exception 'Private tables exposed'; end if;
  if exists(select 1 from pg_class where oid in
    ('public.history'::regclass, 'public.reviews'::regclass, 'public.recognition_usage'::regclass)
    and not relrowsecurity)
  then raise exception 'RLS disabled'; end if;
  if exists(select 1 from storage.buckets where id = 'plant-images' and public)
  then raise exception 'Image bucket public'; end if;
  for i in 1..10 loop
    q := public.reserve_recognition(u);
    if not (q->>'allowed')::boolean or (q->>'used')::integer <> i
    then raise exception 'Reservation % failed: %', i, q; end if;
  end loop;
  q := public.reserve_recognition(u);
  if (q->>'allowed')::boolean or (q->>'used')::integer <> 10
  then raise exception 'Eleventh request accepted: %', q; end if;
  update public.recognition_usage set created_at = clock_timestamp() - interval '8 hours 1 second' where user_id = u;
  q := public.reserve_recognition(u);
  if not (q->>'allowed')::boolean or (q->>'used')::integer <> 1
  then raise exception 'Window did not expire: %', q; end if;
  raise notice 'PASS quota, expiration, table privileges, RLS and bucket checks';
end;
$$;
rollback;
