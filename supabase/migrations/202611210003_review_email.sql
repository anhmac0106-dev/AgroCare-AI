-- Deploy backend with review response allowlist BEFORE applying this migration.
begin;
alter table public.reviews add column user_email text;
update public.reviews r set user_email=u.email from auth.users u where r.user_id=u.id;
create function public.capture_review_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  select email into new.user_email from auth.users where id=new.user_id;
 else
  new.user_id:=old.user_id;
  new.user_email:=old.user_email;
 end if;
 return new;
end;
$$;
revoke all on function public.capture_review_email() from public,anon,authenticated;
create trigger capture_review_email before insert or update on public.reviews
for each row execute function public.capture_review_email();
comment on column public.reviews.user_email is 'Authenticated email snapshot at submission; exposed by backend to administrators only.';
commit;
