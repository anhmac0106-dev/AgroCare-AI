-- Trusted service-role backend supplies p_is_admin from ADMIN_USER_IDS.
-- Keep 24h usage even for regular users so promotion preserves recent usage.
begin;
drop function public.recognition_quota(uuid);
drop function public.reserve_recognition(uuid);
create function public.recognition_quota(p_user_id uuid, p_is_admin boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_limit integer := case when p_is_admin then 50 else 10 end;
    v_hours integer := case when p_is_admin then 24 else 8 end;
    v_now timestamptz := clock_timestamp();
    v_used integer;
    v_reset timestamptz;
begin
    if p_user_id is null then raise exception 'user_id is required'; end if;
    select count(*)::integer, min(created_at) + make_interval(hours => v_hours)
      into v_used, v_reset
      from public.recognition_usage
      where user_id = p_user_id and created_at > v_now - make_interval(hours => v_hours);
    return jsonb_build_object('limit', v_limit, 'windowHours', v_hours, 'allowed', v_used < v_limit, 'used', v_used,
        'remaining', greatest(0, v_limit - v_used), 'resetAt', v_reset);
end;
$$;

create function public.reserve_recognition(p_user_id uuid, p_is_admin boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_limit integer := case when p_is_admin then 50 else 10 end;
    v_hours integer := case when p_is_admin then 24 else 8 end;
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
      where user_id = p_user_id and created_at <= v_now - interval '24 hours';
    select count(*)::integer, min(created_at) + make_interval(hours => v_hours)
      into v_used, v_reset from public.recognition_usage where user_id = p_user_id
        and created_at > v_now - make_interval(hours => v_hours);
    if v_used >= v_limit then
        return jsonb_build_object('limit', v_limit, 'windowHours', v_hours, 'allowed', false, 'used', v_used,
            'remaining', 0, 'resetAt', v_reset);
    end if;
    insert into public.recognition_usage(user_id, created_at) values (p_user_id, v_now);
    return jsonb_build_object('limit', v_limit, 'windowHours', v_hours, 'allowed', true, 'used', v_used + 1,
        'remaining', v_limit - 1 - v_used, 'resetAt', coalesce(v_reset, v_now + make_interval(hours => v_hours)));
end;
$$;

revoke all on function public.recognition_quota(uuid, boolean) from public, anon, authenticated;
revoke all on function public.reserve_recognition(uuid, boolean) from public, anon, authenticated;
grant execute on function public.recognition_quota(uuid, boolean) to service_role;
grant execute on function public.reserve_recognition(uuid, boolean) to service_role;


commit;
