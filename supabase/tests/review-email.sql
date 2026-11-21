-- Run as postgres after migration 003. All test data is rolled back.
begin;
do $$ declare u uuid:=gen_random_uuid(); r uuid; e text; begin
insert into auth.users(id,email) values(u,'review-test@example.com');
insert into public.reviews(user_id,name,star,content,user_email) values(u,'Test',5,'Test','forged@example.com') returning id,user_email into r,e;
if e is distinct from 'review-test@example.com' then raise exception 'Email spoof accepted'; end if;
update public.reviews set user_email='forged-again@example.com',content='Edited' where id=r returning user_email into e;
if e is distinct from 'review-test@example.com' then raise exception 'Email snapshot changed'; end if;
if has_table_privilege('authenticated','public.reviews','SELECT') or has_function_privilege('authenticated','public.capture_review_email()','EXECUTE') then raise exception 'Browser permission exposed'; end if;
end; $$;
select 'PASS: verified email capture, immutable snapshot, browser access denied' as result;
rollback;
