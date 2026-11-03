-- كلمة مرور لكل مستخدم بجانب رمز واتساب
alter table public.members
  add column if not exists pw_hash text,
  add column if not exists pw_init bytea,
  add column if not exists pw_fails int not null default 0,
  add column if not exists pw_locked_until timestamptz;

-- مفتاح تشفير كلمات المرور الأولى (يراها المدير لين يغيّرها المستخدم)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'pw_init_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'pw_init_key');
  end if;
end $$;

create or replace function public._pw_key() returns text language sql stable security definer set search_path = '' as
$$ select decrypted_secret from vault.decrypted_secrets where name = 'pw_init_key' limit 1 $$;
revoke all on function public._pw_key() from public, anon, authenticated;

create or replace function public._pw_ok(p text) returns boolean language sql immutable as
$$ select p is not null and length(p) between 6 and 64 $$;

-- يضبط كلمة المرور؛ p_init = true تعني أن المدير وضعها فتبقى ظاهرة له
create or replace function public._pw_set(p_phone text, p_pw text, p_init boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set
    pw_hash = extensions.crypt(p_pw, extensions.gen_salt('bf', 10)),
    pw_init = case when p_init then extensions.pgp_sym_encrypt(p_pw, public._pw_key()) else null end,
    pw_fails = 0, pw_locked_until = null
  where phone = p_phone;
end $$;
revoke all on function public._pw_set(text, text, boolean) from public, anon, authenticated;

-- الدخول بكلمة المرور
create or replace function public.login_password(p_phone text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public._t6(p_phone); m public.members;
begin
  if v_phone is null then return jsonb_build_object('error','bad_phone'); end if;
  select * into m from public.members where phone = v_phone;
  if m.phone is null then return jsonb_build_object('error','not_registered'); end if;
  if m.pw_hash is null then return jsonb_build_object('error','no_password'); end if;
  if m.pw_locked_until is not null and m.pw_locked_until > now() then return jsonb_build_object('error','pw_locked'); end if;
  if extensions.crypt(coalesce(p_password,''), m.pw_hash) <> m.pw_hash then
    update public.members set
      pw_locked_until = case when pw_fails + 1 >= 5 then now() + interval '15 minutes' else null end,
      pw_fails = case when pw_fails + 1 >= 5 then 0 else pw_fails + 1 end
    where phone = v_phone;
    return jsonb_build_object('error','wrong_password');
  end if;
  update public.members set pw_fails = 0, pw_locked_until = null where phone = v_phone;
  return public._t2(v_phone) || jsonb_build_object('role', m.role);
end $$;
grant execute on function public.login_password(text, text) to anon, authenticated;

-- المستخدم يغيّر كلمة مروره (أو يضعها أول مرة بعد الدخول برمز واتساب)
create or replace function public.password_change(p_token text, p_new text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public._session_phone(p_token);
begin
  if v_phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if not public._pw_ok(p_new) then return jsonb_build_object('error','bad_password'); end if;
  perform public._pw_set(v_phone, p_new, false);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.password_change(text, text) to anon, authenticated;

-- حالة كلمة المرور للمستخدم الحالي
create or replace function public.session_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_phone text := public._session_phone(p_token); m public.members;
begin
  if v_phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into m from public.members where phone = v_phone;
  return jsonb_build_object('ok', true, 'phone', v_phone, 'role', m.role, 'name', m.name,
    'has_password', m.pw_hash is not null, 'password_from_admin', m.pw_init is not null);
end $$;

-- إضافة مستخدم مع كلمة مرور أولى اختيارية
drop function if exists public.member_add(text, text, text, text);
create or replace function public.member_add(p_token text, p_phone text, p_name text, p_role text, p_budget numeric, p_password text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_phone text := public._t6(p_phone);
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  if v_phone is null then return jsonb_build_object('error','bad_phone'); end if;
  if nullif(p_password,'') is not null and not public._pw_ok(p_password) then return jsonb_build_object('error','bad_password'); end if;
  if exists (select 1 from public.members m where m.phone = v_phone) then return jsonb_build_object('error','exists'); end if;
  insert into public.members(phone, name, role, budget) values (v_phone, coalesce(p_name,''),
    case when p_role in ('admin','accountant','custodian') then p_role else 'staff' end,
    case when p_role = 'accountant' then greatest(round(coalesce(p_budget,0),2),0) else 0 end);
  if nullif(p_password,'') is not null then perform public._pw_set(v_phone, p_password, true); end if;
  return jsonb_build_object('ok', true);
end $$;
drop function if exists public.member_add(text, text, text, text, numeric);
grant execute on function public.member_add(text, text, text, text, numeric, text) to anon, authenticated;

-- تعديل مستخدم؛ p_password يعيد تعيين كلمة مروره (تظهر للمدير لين يغيّرها)
drop function if exists public.member_update(text, text, text, text, numeric);
create or replace function public.member_update(p_token text, p_phone text, p_name text, p_role text, p_budget numeric, p_password text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  if p_phone = public._session_phone(p_token) and p_role <> 'admin' then return jsonb_build_object('error','self'); end if;
  if nullif(p_password,'') is not null and not public._pw_ok(p_password) then return jsonb_build_object('error','bad_password'); end if;
  update public.members set name = coalesce(p_name, name),
    role = case when p_role in ('admin','accountant','custodian') then p_role else 'staff' end,
    budget = case when p_role = 'accountant' then greatest(round(coalesce(p_budget,0),2),0) else 0 end
  where phone = p_phone;
  if nullif(p_password,'') is not null then perform public._pw_set(p_phone, p_password, p_phone <> public._session_phone(p_token)); end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.member_update(text, text, text, text, numeric, text) to anon, authenticated;

create or replace function public.members_list(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'members',
    coalesce((select jsonb_agg(jsonb_build_object('phone', m.phone, 'name', m.name, 'role', m.role, 'budget', m.budget,
      'has_password', m.pw_hash is not null,
      'init_password', case when m.pw_init is not null then extensions.pgp_sym_decrypt(m.pw_init, public._pw_key()) end)
      order by m.created_at) from public.members m), '[]'::jsonb));
end $$;
