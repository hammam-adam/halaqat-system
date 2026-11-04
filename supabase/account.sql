-- حسابي: بياناتي، تغيير الرقم، الأجهزة المسجّل دخولها، وتنبيه عند تغيير كلمة المرور
alter table public.app_sessions add column if not exists ua text;
alter table public.app_sessions drop constraint if exists app_sessions_phone_fkey;
alter table public.app_sessions add constraint app_sessions_phone_fkey foreign key (phone) references public.members(phone) on update cascade on delete cascade;

create or replace function public._sess_ua() returns trigger language plpgsql set search_path = '' as $$
begin
  begin new.ua := left(coalesce((current_setting('request.headers', true))::json->>'user-agent', ''), 300);
  exception when others then new.ua := null; end;
  return new;
end $$;
drop trigger if exists sess_ua on public.app_sessions;
create trigger sess_ua before insert on public.app_sessions for each row execute function public._sess_ua();

create or replace function public.my_profile(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me public.members := public._me(p_token); h text := public._hash(coalesce(p_token,''));
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  return jsonb_build_object('ok', true, 'phone', me.phone, 'name', me.name, 'email', me.email, 'role', me.role, 'budget', me.budget,
    'created_at', me.created_at, 'has_password', me.pw_hash is not null, 'password_from_admin', me.pw_init is not null,
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('created_at', s.created_at, 'ua', s.ua, 'current', s.token_hash = h) order by s.created_at desc)
      from (select * from public.app_sessions where phone = me.phone and expires_at > now() order by created_at desc limit 20) s), '[]'::jsonb));
end $$;
grant execute on function public.my_profile(text) to anon, authenticated;

create or replace function public.profile_update(p_token text, p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 80 then return jsonb_build_object('error','bad_name'); end if;
  if nullif(trim(p_email),'') is not null and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('error','bad_email'); end if;
  update public.members set name = trim(p_name), email = nullif(lower(trim(p_email)),'') where phone = me.phone;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.profile_update(text, text, text) to anon, authenticated;

create or replace function public.phone_change(p_token text, p_new text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); v_new text := public._norm_phone(p_new); v_old text;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  v_old := me.phone;
  if v_new is null then return jsonb_build_object('error','bad_phone'); end if;
  if v_new = v_old then return jsonb_build_object('error','same_phone'); end if;
  if exists (select 1 from public.members where phone = v_new) then return jsonb_build_object('error','exists'); end if;
  if me.pw_hash is not null and extensions.crypt(coalesce(p_password,''), me.pw_hash) <> me.pw_hash then return jsonb_build_object('error','wrong_password'); end if;
  update public.members set phone = v_new where phone = v_old;
  update public.custodies set holder = v_new where holder = v_old;
  update public.custodies set created_by = v_new where created_by = v_old;
  update public.custodies set issued_by = v_new where issued_by = v_old;
  update public.custodies set closed_by = v_new where closed_by = v_old;
  update public.tasks set created_by = v_new where created_by = v_old;
  update public.messages set sent_by = v_new where sent_by = v_old;
  update public.messages set recipients = array_replace(recipients, v_old, v_new) where v_old = any(recipients);
  update public.reward_receipts set created_by = v_new where created_by = v_old;
  delete from public.login_codes where phone = v_old;
  return jsonb_build_object('ok', true, 'phone', v_new);
end $$;
grant execute on function public.phone_change(text, text, text) to anon, authenticated;

create or replace function public.sessions_end_others(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); n int;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  delete from public.app_sessions where phone = me.phone and token_hash <> public._hash(coalesce(p_token,''));
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'ended', n);
end $$;
grant execute on function public.sessions_end_others(text) to anon, authenticated;

create or replace function public.password_change(p_token text, p_new text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public._session_phone(p_token);
begin
  if v_phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if not public._pw_ok(p_new) then return jsonb_build_object('error','bad_password'); end if;
  perform public._pw_set(v_phone, p_new, false);
  begin
    perform public._wa_enqueue(v_phone, '*' || public._cfg('org_name') || '*' || E'\n' ||
      'تم تغيير كلمة مرور حسابك في النظام المالي.' || E'\n' ||
      'إذا لم تكن أنت، ادخل برمز واتساب وغيّرها فورًا، أو تواصل مع مدير النظام.', 1);
  exception when others then null; end;
  return jsonb_build_object('ok', true);
end $$;
