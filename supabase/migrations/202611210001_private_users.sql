-- Run once in a NEW Supabase project (SQL Editor as postgres).
begin;

create table public.history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    image text not null check (char_length(image) between 1 and 512),
    disease text not null check (char_length(disease) <= 1000),
    solution text not null check (char_length(solution) <= 12000),
    level text not null check (char_length(level) <= 100),
    result jsonb not null check (jsonb_typeof(result) = 'object'),
    created_at timestamptz not null default now()
);
create index history_user_created_idx on public.history(user_id, created_at desc);

create table public.reviews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 100),
    star integer not null check (star between 1 and 5),
    content text not null check (char_length(btrim(content)) between 1 and 2000),
    likes integer not null default 0 check (likes >= 0),
    created_at timestamptz not null default now()
);
create index reviews_user_created_idx on public.reviews(user_id, created_at desc);

create table public.recognition_usage (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default clock_timestamp()
);
create index recognition_usage_user_created_idx on public.recognition_usage(user_id, created_at);

-- All application data goes through the authenticated backend. A browser token
-- has no direct table access, even to its own rows. The service-role backend
-- must scope every operation to the verified user or explicit admin read scope.
alter table public.history enable row level security;
alter table public.reviews enable row level security;
alter table public.recognition_usage enable row level security;
revoke all on public.history, public.reviews, public.recognition_usage from public, anon, authenticated;
grant select, insert, update, delete on public.history, public.reviews, public.recognition_usage to service_role;

create function public.recognition_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_now timestamptz := clock_timestamp();
    v_used integer;
    v_reset timestamptz;
begin
    if p_user_id is null then raise exception 'user_id is required'; end if;
    select count(*)::integer, min(created_at) + interval '8 hours'
      into v_used, v_reset
      from public.recognition_usage
      where user_id = p_user_id and created_at > v_now - interval '8 hours';
    return jsonb_build_object('allowed', v_used < 10, 'used', v_used,
        'remaining', greatest(0, 10 - v_used), 'resetAt', v_reset);
end;
$$;

create function public.reserve_recognition(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_now timestamptz;
    v_used integer;
    v_reset timestamptz;
begin
    if p_user_id is null then raise exception 'user_id is required'; end if;
    -- Serializes the count+insert for this user across every Vercel instance.
    -- Hash collisions only cause additional waiting, never quota bypass.
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 73421));
    v_now := clock_timestamp();
    delete from public.recognition_usage
      where user_id = p_user_id and created_at <= v_now - interval '8 hours';
    select count(*)::integer, min(created_at) + interval '8 hours'
      into v_used, v_reset from public.recognition_usage where user_id = p_user_id;
    if v_used >= 10 then
        return jsonb_build_object('allowed', false, 'used', v_used,
            'remaining', 0, 'resetAt', v_reset);
    end if;
    insert into public.recognition_usage(user_id, created_at) values (p_user_id, v_now);
    return jsonb_build_object('allowed', true, 'used', v_used + 1,
        'remaining', 9 - v_used, 'resetAt', coalesce(v_reset, v_now + interval '8 hours'));
end;
$$;

revoke all on function public.recognition_quota(uuid) from public, anon, authenticated;
revoke all on function public.reserve_recognition(uuid) from public, anon, authenticated;
grant execute on function public.recognition_quota(uuid) to service_role;
grant execute on function public.reserve_recognition(uuid) to service_role;

-- No storage.objects policy is added: clients cannot read/upload directly.
-- Read/download is performed by the backend after checking history ownership.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('plant-images', 'plant-images', false, 3145728, array['image/jpeg', 'image/png']);

commit;
