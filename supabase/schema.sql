-- Quran circles system: full backend for one instance.
-- Generated for schema "public". Apply on an empty schema.
set check_function_bodies = off;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;
create schema if not exists public;

-- per-instance settings (org name, site link, name of the vault secret holding the WasenderAPI key)
create table public.app_config (key text primary key, value text not null default '');
insert into public.app_config(key,value) values
  ('org_name','مجمع الحلقات'),
  ('site_url','https://example.vercel.app'),
  ('wa_secret','wasender_api_key');
create or replace function public._cfg(k text) returns text language sql stable security definer set search_path to ''
as $$ select value from public.app_config where key = k $$;

create table public.members (phone text primary key check (phone ~ '^[0-9]{8,15}$'), name text not null default '', role text not null default 'staff' check (role in ('admin','staff','accountant','custodian')), created_at timestamptz not null default now(), budget numeric(12,2) not null default 0);
create table public.docs (collection text not null check (collection in ('halaqat','students','teachers','transactions','settings')), id text not null, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid default auth.uid(), primary key (collection,id));
create table public.login_codes (phone text primary key, code_hash text not null, expires_at timestamptz not null, attempts integer not null default 0, sent_at timestamptz not null default now());
create table public.app_sessions (token_hash text primary key, phone text not null references public.members(phone) on delete cascade, expires_at timestamptz not null, created_at timestamptz not null default now());
create table public.custodies (id bigserial primary key, holder text not null, holder_name text not null default '', purpose text not null default '', requested numeric(12,2) not null default 0, amount numeric(12,2) not null default 0, status text not null default 'requested' check (status in ('requested','rejected','open','submitted','closed')), note text not null default '', created_by text not null, created_at timestamptz not null default now(), issued_by text, issued_at timestamptz, submitted_at timestamptz, closed_by text, closed_at timestamptz, spent numeric(12,2), returned numeric(12,2), submit_kind text not null default 'final' check (submit_kind in ('partial','final')), settled_total numeric(12,2) not null default 0, reminded_at timestamptz);
create index custodies_holder_idx on public.custodies(holder);
create table public.custody_items (id bigserial primary key, custody_id bigint not null references public.custodies(id) on delete cascade, date date not null default current_date, amount numeric(12,2) not null check (amount > 0), descr text not null default '', category text not null default 'أخرى', file_name text not null default '', file_mime text not null default '', file_data text, created_at timestamptz not null default now(), settled boolean not null default false);
create index custody_items_custody_id_idx on public.custody_items(custody_id);
create table public.tasks (id bigserial primary key, title text not null, details text not null default '', assignee text not null references public.members(phone) on update cascade on delete cascade, assignee_name text not null default '', due date, status text not null default 'open' check (status in ('open','done')), done_note text not null default '', done_at timestamptz, created_by text not null, created_at timestamptz not null default now());
create table public.messages (id bigserial primary key, sent_by text not null, recipients text[] not null, names text[] not null default '{}', body text not null, created_at timestamptz not null default now());
create table public.wa_outbox (id bigserial primary key, phone text not null, body text not null, prio integer not null default 1, status text not null default 'pending' check (status in ('pending','sending','sent','failed')), tries integer not null default 0, send_after timestamptz not null default now(), req_id bigint, attempted_at timestamptz, sent_at timestamptz, last_error text, created_at timestamptz not null default now());
create index wa_outbox_pending on public.wa_outbox(status, prio, id);

-- all access goes through the security-definer functions below; tables are closed to the API
do $$ declare t text; begin
  foreach t in array array['app_config','members','docs','login_codes','app_sessions','custodies','custody_items','tasks','messages','wa_outbox'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop; end $$;

CREATE OR REPLACE FUNCTION public._budget_add(p_phone text, p_delta numeric)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.members set budget = budget + p_delta where phone = p_phone and role = 'accountant'
$function$
;

CREATE OR REPLACE FUNCTION public._cost(d jsonb)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when d is not null and d->>'type' = 'expense' and not coalesce((d->>'void')::boolean, false) and d->>'custodyId' is null
    then coalesce((d->>'amount')::numeric, 0) else 0 end
$function$
;

CREATE OR REPLACE FUNCTION public._cust_json(c public.custodies, p_files boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select to_jsonb(c) || jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'date', i.date, 'amount', i.amount, 'descr', i.descr, 'category', i.category,
      'file_name', i.file_name, 'file_mime', i.file_mime, 'has_file', i.file_data is not null, 'settled', i.settled) order by i.settled desc, i.date, i.id)
    from public.custody_items i where i.custody_id = c.id), '[]'::jsonb))
$function$
;

CREATE OR REPLACE FUNCTION public._cust_vouchers(p_id bigint, p_by text)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with c as (select * from public.custodies where id = p_id),
  base as (select coalesce(max((d.data->>'no')::int),0) n from public.docs d where d.collection = 'transactions' and d.data->>'type' = 'expense'),
  g as (select i.category, sum(i.amount) amt, row_number() over (order by i.category) rn from public.custody_items i where i.custody_id = p_id and not i.settled group by i.category),
  ins as (
    insert into public.docs(collection, id, data)
    select 'transactions', gen_random_uuid()::text, jsonb_build_object(
      'type','expense', 'no', base.n + g.rn, 'amount', g.amt, 'date', to_char(now() at time zone 'Asia/Riyadh','YYYY-MM-DD'),
      'category', g.category, 'method','cash', 'halaqaId','', 'studentId','', 'teacherId','', 'rewardMonth','', 'feeMonth','',
      'party', c.holder_name, 'note', 'تصفية العهدة ع-' || lpad(c.id::text,4,'0') || ' · ' || c.purpose,
      'custodyId', c.id, 'void', false, 'createdAt', to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'createdBy', p_by)
    from g, base, c returning 1)
  select count(*)::int from ins
$function$
;

CREATE OR REPLACE FUNCTION public._del_doc(c text, i text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ delete from public.docs where collection = c and id = i $function$
;

CREATE OR REPLACE FUNCTION public._del_member(p text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ delete from public.members where phone = p $function$
;

CREATE OR REPLACE FUNCTION public._fmt(p_icon text, p_title text, p_body text, p_tail text DEFAULT ''::text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select '*' || public._cfg('org_name') || '*' || E'\n' || '━━━━━━━━━━━━━━' || E'\n' ||
    p_icon || ' *' || p_title || '*' || E'\n\n' ||
    rtrim(coalesce(p_body,''), E'\n') ||
    case when coalesce(p_tail,'') <> '' then E'\n\n' || '_' || p_tail || '_' else '' end ||
    E'\n\n' || '🔗 ' || public._cfg('site_url')
$function$
;

CREATE OR REPLACE FUNCTION public._hash(v text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select encode(extensions.digest(v, 'sha256'), 'hex') $function$
;

CREATE OR REPLACE FUNCTION public._is_admin_token(p_token text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.members m where m.phone = public._session_phone(p_token) and m.role = 'admin')
$function$
;

CREATE OR REPLACE FUNCTION public._item_del(p_item bigint)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ delete from public.custody_items where id = p_item $function$
;

CREATE OR REPLACE FUNCTION public._items_settle(p_id bigint)
 RETURNS numeric
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with u as (update public.custody_items set settled = true where custody_id = p_id and not settled returning amount)
  select coalesce(sum(amount),0) from u
$function$
;

CREATE OR REPLACE FUNCTION public._ln(p_label text, p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when coalesce(trim(p_value),'') = '' then '' else '▪️ *' || p_label || ':* ' || trim(p_value) || E'\n' end
$function$
;

CREATE OR REPLACE FUNCTION public._me(p_token text)
 RETURNS members
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.* from public.members m where m.phone = public._session_phone(p_token)
$function$
;

CREATE OR REPLACE FUNCTION public._new_token()
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select encode(extensions.gen_random_bytes(32), 'hex') $function$
;

CREATE OR REPLACE FUNCTION public._norm_phone(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare d text := regexp_replace(coalesce(p,''), '[^0-9]', '', 'g');
begin
  if d like '00%' then d := substr(d, 3); end if;
  if d like '966%' then d := substr(d, 4); end if;
  if d like '0%' then d := substr(d, 2); end if;
  if d ~ '^5[0-9]{8}$' then return '966' || d; end if;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public._notify_mgrs(p_text text, p_except text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select count(public._wa_send(m.phone, p_text)) from public.members m where m.role in ('admin','accountant') and m.phone <> coalesce(p_except,'')
$function$
;

CREATE OR REPLACE FUNCTION public._purge_custodies()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_v int; v_i int; v_c int;
begin
  with d as (delete from public.docs where collection = 'transactions' and data ? 'custodyId' returning 1) select count(*) into v_v from d;
  with d as (delete from public.custody_items returning 1) select count(*) into v_i from d;
  with d as (delete from public.custodies returning 1) select count(*) into v_c from d;
  perform setval('public.custodies_id_seq', 1, false);
  perform setval('public.custody_items_id_seq', 1, false);
  return jsonb_build_object('custodies', v_c, 'items', v_i, 'vouchers', v_v);
end $function$
;

CREATE OR REPLACE FUNCTION public._sar(n numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select regexp_replace(to_char(round(coalesce(n,0),2),'FM999,999,990.00'),'\.00$','') || ' ر.س'
$function$
;

CREATE OR REPLACE FUNCTION public._session_phone(p_token text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select s.phone from public.app_sessions s join public.members m on m.phone = s.phone
  where s.token_hash = public._hash(coalesce(p_token,'')) and s.expires_at > now()
$function$
;

CREATE OR REPLACE FUNCTION public._store_code(p text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c text := lpad((floor(random()*1000000))::int::text, 6, '0');
begin
  insert into public.login_codes(phone, code_hash, expires_at, attempts, sent_at)
  values (p, public._hash(p || ':' || c), now() + interval '5 minutes', 0, now())
  on conflict (phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = now();
  return c;
end $function$
;

CREATE OR REPLACE FUNCTION public._t1(p text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.login_codes set attempts = attempts + 1 where phone = p;
  return 1;
end $function$
;

CREATE OR REPLACE FUNCTION public._t2(p text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_token text; v_role text;
begin
  v_token := public._new_token();
  insert into public.app_sessions(token_hash, phone, expires_at) values (public._hash(v_token), p, now() + interval '30 days');
  return jsonb_build_object('ok', true, 'token', v_token, 'phone', p, 'role', v_role);
end $function$
;

CREATE OR REPLACE FUNCTION public._t3(p_phone text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_hash text; v_exp timestamptz; v_att int;
begin
  select code_hash, expires_at, attempts into v_hash, v_exp, v_att from public.login_codes where phone = p_phone;
  if v_hash is null or v_exp < now() then return jsonb_build_object('error','expired'); end if;
  if v_hash <> public._hash(p_phone || ':' || coalesce(p_code,'')) then return jsonb_build_object('error','wrong_code'); end if;
  return '{}'::jsonb;
end $function$
;

CREATE OR REPLACE FUNCTION public._t4(p text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.login_codes where phone = p;
  return 1;
end $function$
;

CREATE OR REPLACE FUNCTION public._t5()
 RETURNS jsonb
 LANGUAGE sql
AS $function$ select jsonb_build_object('error','not_registered') $function$
;

CREATE OR REPLACE FUNCTION public._t6(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_phone text := public._norm_phone(p_phone);
begin return v_phone; end $function$
;

CREATE OR REPLACE FUNCTION public._t7(p text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.login_codes where phone = p;
  return 1;
end $function$
;

CREATE OR REPLACE FUNCTION public._task_json(t public.tasks)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('id',t.id,'title',t.title,'details',t.details,'assignee',t.assignee,'assignee_name',t.assignee_name,
    'due',t.due,'status',t.status,'done_note',t.done_note,'done_at',t.done_at,'created_at',t.created_at)
$function$
;

CREATE OR REPLACE FUNCTION public._task_rm(p_id bigint)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ delete from public.tasks where id = p_id $function$
;

CREATE OR REPLACE FUNCTION public._wa_code(p_to text, p_text text)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public._wa_enqueue(p_to, p_text, 0) $function$
;

CREATE OR REPLACE FUNCTION public._wa_enqueue(p_to text, p_text text, p_prio integer)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id bigint;
begin
  if not exists (select 1 from vault.decrypted_secrets where name = public._cfg('wa_secret')) then return null; end if;
  insert into public.wa_outbox(phone, body, prio) values (p_to, p_text, p_prio) returning id into v_id;
  perform public._wa_pump();
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public._wa_post(p_to text, p_text text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = public._cfg('wa_secret') limit 1;
  if k is null then return null; end if;
  return net.http_post(
    url := 'https://www.wasenderapi.com/api/send-message',
    body := jsonb_build_object('to', '+' || p_to, 'text', p_text),
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || k),
    timeout_milliseconds := 15000);
end $function$
;

CREATE OR REPLACE FUNCTION public._wa_pump()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n public.wa_outbox; v_req bigint; v_ok boolean; v_wait int;
begin
  if not pg_try_advisory_xact_lock(424242) then return; end if;
  for r in select o.id, o.tries, o.attempted_at, h.status_code, h.content, h.headers, h.error_msg, h.timed_out
           from public.wa_outbox o left join net._http_response h on h.id = o.req_id where o.status = 'sending' loop
    if r.status_code is null and r.error_msg is null and not coalesce(r.timed_out, false) then
      if r.attempted_at < now() - interval '90 seconds' then
        update public.wa_outbox set status = case when r.tries >= 12 then 'failed' else 'pending' end, last_error = 'no_response', send_after = now() where id = r.id;
      end if;
      continue;
    end if;
    v_ok := false;
    if r.status_code between 200 and 299 then
      begin v_ok := coalesce((r.content::jsonb->>'success')::boolean, true); exception when others then v_ok := true; end;
    end if;
    if v_ok then
      update public.wa_outbox set status = 'sent', sent_at = now(), last_error = null where id = r.id;
    elsif r.status_code is null or r.status_code = 429 or r.status_code >= 500 then
      v_wait := 6;
      begin v_wait := greatest(coalesce(nullif(r.headers->>'x-ratelimit-reset','')::int, 5), 5) + 1; exception when others then v_wait := 6; end;
      update public.wa_outbox set status = case when r.tries >= 12 then 'failed' else 'pending' end,
        send_after = now() + make_interval(secs => v_wait + least(r.tries, 6) * 5),
        last_error = coalesce(r.status_code::text, 'error') || ' ' || left(coalesce(r.content, r.error_msg, ''), 200) where id = r.id;
    else
      update public.wa_outbox set status = 'failed', last_error = r.status_code || ' ' || left(coalesce(r.content, ''), 200) where id = r.id;
    end if;
  end loop;

  if exists (select 1 from public.wa_outbox where status = 'sending') then return; end if;
  if (select max(attempted_at) from public.wa_outbox) > now() - interval '6 seconds' then return; end if;
  select * into n from public.wa_outbox where status = 'pending' and send_after <= now() order by prio, id limit 1 for update skip locked;
  if n.id is null then return; end if;
  v_req := public._wa_post(n.phone, n.body);
  if v_req is null then
    update public.wa_outbox set status = 'failed', last_error = 'sender_not_configured' where id = n.id;
    return;
  end if;
  update public.wa_outbox set status = 'sending', req_id = v_req, tries = tries + 1, attempted_at = now() where id = n.id;
end $function$
;

CREATE OR REPLACE FUNCTION public._wa_send(p_to text, p_text text)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public._wa_enqueue(p_to, p_text, 1)
$function$
;

CREATE OR REPLACE FUNCTION public._wa_tell(p_actor text, p_to text, p_text text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare who text;
begin
  perform public._wa_send(p_to, p_text);
  select name into who from public.members where phone = p_to;
  perform public._wa_send(m.phone, '📋 _نسخة للإدارة — أُرسلت إلى ' || coalesce(who, p_to) || '_' || E'\n\n' || p_text)
    from public.members m where m.role in ('admin','accountant') and m.phone <> coalesce(p_actor,'') and m.phone <> p_to;
end $function$
;

CREATE OR REPLACE FUNCTION public.app_delete(p_token text, p_collection text, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role = 'custodian' then return jsonb_build_object('error','forbidden'); end if;
  perform public._del_doc(p_collection, p_id);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.app_load(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role = 'custodian' then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'docs',
    coalesce((select jsonb_agg(jsonb_build_object('c', d.collection, 'id', d.id, 'd', d.data)) from public.docs d), '[]'::jsonb));
end $function$
;

CREATE OR REPLACE FUNCTION public.app_put(p_token text, p_collection text, p_id text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); v_old jsonb; v_delta numeric;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role = 'custodian' then return jsonb_build_object('error','forbidden'); end if;
  if me.role = 'accountant' and p_collection = 'transactions' then
    select data into v_old from public.docs where collection = p_collection and id = p_id;
    v_delta := public._cost(p_data) - public._cost(v_old);
    if v_delta > me.budget then return jsonb_build_object('error','over_budget', 'budget', me.budget); end if;
    if v_delta <> 0 then perform public._budget_add(me.phone, -v_delta); end if;
  end if;
  insert into public.docs(collection, id, data) values (p_collection, p_id, p_data)
  on conflict (collection, id) do update set data = excluded.data;
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.current_phone()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select nullif(regexp_replace(coalesce(auth.jwt()->>'phone',''), '[^0-9]', '', 'g'), '')
$function$
;

CREATE OR REPLACE FUNCTION public.cust_cancel(p_token text, p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into c from public.custodies where id = p_id for update;
  if c.id is null or c.holder <> me.phone then return jsonb_build_object('error','forbidden'); end if;
  if c.status <> 'requested' then return jsonb_build_object('error','bad_state'); end if;
  update public.custodies set status = 'rejected', note = 'أُلغي الطلب بطلب صاحبه', issued_at = now() where id = c.id;
  perform public._notify_mgrs(public._fmt('🚫', 'أُلغي طلب عهدة',
    public._ln('رقم الطلب', 'ع-' || lpad(c.id::text,4,'0')) || public._ln('مقدّم الطلب', c.holder_name) ||
    public._ln('المبلغ', public._sar(c.requested)) || public._ln('الغرض', c.purpose),
    'ألغى صاحب الطلب طلبه قبل اعتماده.'), me.phone);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_close(p_token text, p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies; v_new numeric; v_n int; v_total numeric; v_final boolean; v_no text;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  select * into c from public.custodies where id = p_id for update;
  if c.id is null or c.status <> 'submitted' then return jsonb_build_object('error','bad_state'); end if;
  v_no := 'ع-' || lpad(c.id::text,4,'0');
  v_n := public._cust_vouchers(c.id, me.phone);
  v_new := public._items_settle(c.id);
  v_total := c.settled_total + v_new;
  v_final := c.submit_kind = 'final' or v_total >= c.amount;
  if v_final then
    update public.custodies set status = 'closed', closed_by = me.phone, closed_at = now(), settled_total = v_total, spent = v_total, returned = amount - v_total where id = c.id;
    perform public._budget_add(c.issued_by, c.amount - v_total);
    perform public._wa_tell(me.phone, c.holder, public._fmt('🧾', 'تمت تصفية العهدة وإغلاقها',
      public._ln('رقم العهدة', v_no) || public._ln('مبلغ العهدة', public._sar(c.amount)) ||
      public._ln('المصروف', public._sar(v_total)) || public._ln('المُرجَع', public._sar(c.amount - v_total)),
      'شكرًا لك، أُغلقت العهدة.'));
  else
    update public.custodies set status = 'open', settled_total = v_total, note = '', submitted_at = null where id = c.id;
    perform public._wa_tell(me.phone, c.holder, public._fmt('🧾', 'اعتُمدت التصفية الجزئية',
      public._ln('رقم العهدة', v_no) || public._ln('المعتمد الآن', public._sar(v_new)) ||
      public._ln('إجمالي المصفّى', public._sar(v_total)) || public._ln('المتبقي في عهدتك', public._sar(c.amount - v_total))));
  end if;
  return jsonb_build_object('ok', true, 'vouchers', v_n, 'closed', v_final);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_decide(p_token text, p_id bigint, p_approve boolean, p_amount numeric, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies; v_amt numeric; v_no text; v_part boolean;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  select * into c from public.custodies where id = p_id for update;
  if c.id is null or c.status <> 'requested' then return jsonb_build_object('error','bad_state'); end if;
  v_no := 'ع-' || lpad(c.id::text,4,'0');
  if not p_approve then
    if coalesce(trim(p_note),'') = '' then return jsonb_build_object('error','no_reason'); end if;
    update public.custodies set status = 'rejected', note = trim(p_note), issued_by = me.phone, issued_at = now() where id = c.id;
    perform public._wa_tell(me.phone, c.holder, public._fmt('❌', 'لم يُعتمد طلب العهدة',
      public._ln('رقم الطلب', v_no) || public._ln('المبلغ المطلوب', public._sar(c.requested)) || public._ln('الغرض', c.purpose) || public._ln('سبب الرفض', p_note)));
    return jsonb_build_object('ok', true);
  end if;
  v_amt := round(coalesce(nullif(p_amount,0), c.requested), 2);
  if v_amt <= 0 then return jsonb_build_object('error','bad_amount'); end if;
  v_part := v_amt < c.requested;
  if v_part and coalesce(trim(p_note),'') = '' then return jsonb_build_object('error','no_reason'); end if;
  if me.role = 'accountant' and v_amt > me.budget then return jsonb_build_object('error','over_budget', 'budget', me.budget); end if;
  update public.custodies set status = 'open', amount = v_amt, note = coalesce(trim(p_note),''), issued_by = me.phone, issued_at = now() where id = c.id;
  perform public._budget_add(me.phone, -v_amt);
  if v_part then
    perform public._wa_tell(me.phone, c.holder, public._fmt('🟡', 'موافقة جزئية على طلب العهدة',
      public._ln('رقم العهدة', v_no) || public._ln('المبلغ المطلوب', public._sar(c.requested)) ||
      public._ln('المبلغ المعتمد', public._sar(v_amt)) || public._ln('الغرض', c.purpose) || public._ln('سبب الموافقة الجزئية', p_note),
      'ارفع فواتيرك من النظام، ثم صفِّ العهدة.'));
  else
    perform public._wa_tell(me.phone, c.holder, public._fmt('✅', 'اعتُمد طلب العهدة',
      public._ln('رقم العهدة', v_no) || public._ln('المبلغ المعتمد', public._sar(v_amt)) || public._ln('الغرض', c.purpose) || public._ln('ملاحظة', p_note),
      'ارفع فواتيرك من النظام، ثم صفِّ العهدة.'));
  end if;
  return jsonb_build_object('ok', true, 'partial', v_part);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_file(p_token text, p_item bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); i public.custody_items; h text;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into i from public.custody_items where id = p_item;
  select holder into h from public.custodies where id = i.custody_id;
  if i.id is null or not (me.role in ('admin','accountant') or h = me.phone) then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'name', i.file_name, 'mime', i.file_mime, 'data', i.file_data);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_issue(p_token text, p_holder text, p_amount numeric, p_purpose text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); h public.members; v_id bigint; v_amt numeric := round(coalesce(p_amount,0),2);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  select * into h from public.members where phone = p_holder;
  if h.phone is null then return jsonb_build_object('error','no_holder'); end if;
  if v_amt <= 0 then return jsonb_build_object('error','bad_amount'); end if;
  if coalesce(trim(p_purpose),'') = '' then return jsonb_build_object('error','no_purpose'); end if;
  if me.role = 'accountant' and v_amt > me.budget then return jsonb_build_object('error','over_budget', 'budget', me.budget); end if;
  insert into public.custodies(holder, holder_name, purpose, requested, amount, status, created_by, issued_by, issued_at)
  values (h.phone, h.name, trim(p_purpose), v_amt, v_amt, 'open', me.phone, me.phone, now()) returning id into v_id;
  perform public._budget_add(me.phone, -v_amt);
  perform public._wa_tell(me.phone, h.phone, public._fmt('📦', 'صُرفت لك عهدة',
    public._ln('رقم العهدة', 'ع-' || lpad(v_id::text,4,'0')) || public._ln('المبلغ', public._sar(v_amt)) || public._ln('الغرض', p_purpose),
    'ارفع فواتيرك من النظام، ثم صفِّ العهدة.'));
  return jsonb_build_object('ok', true, 'id', v_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_item_add(p_token text, p_custody bigint, p_date date, p_amount numeric, p_descr text, p_category text, p_file_name text, p_file_mime text, p_file_data text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies; v_amt numeric := round(coalesce(p_amount,0),2); v_used numeric;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into c from public.custodies where id = p_custody for update;
  if c.id is null or c.holder <> me.phone then return jsonb_build_object('error','forbidden'); end if;
  if c.status <> 'open' then return jsonb_build_object('error','bad_state'); end if;
  if v_amt <= 0 then return jsonb_build_object('error','bad_amount'); end if;
  if coalesce(p_file_data,'') = '' then return jsonb_build_object('error','no_file'); end if;
  if length(p_file_data) > 4000000 then return jsonb_build_object('error','file_too_big'); end if;
  select coalesce(sum(amount),0) into v_used from public.custody_items where custody_id = c.id;
  if v_used + v_amt > c.amount then return jsonb_build_object('error','over_custody', 'left', c.amount - v_used); end if;
  insert into public.custody_items(custody_id, date, amount, descr, category, file_name, file_mime, file_data)
  values (c.id, coalesce(p_date, current_date), v_amt, coalesce(trim(p_descr),''), coalesce(nullif(trim(p_category),''),'أخرى'), coalesce(p_file_name,''), coalesce(p_file_mime,''), p_file_data);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_item_del(p_token text, p_item bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies; v_settled boolean;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select c2.* into c from public.custodies c2 join public.custody_items i on i.custody_id = c2.id where i.id = p_item;
  select settled into v_settled from public.custody_items where id = p_item;
  if c.id is null or c.holder <> me.phone then return jsonb_build_object('error','forbidden'); end if;
  if c.status <> 'open' or v_settled then return jsonb_build_object('error','bad_state'); end if;
  perform public._item_del(p_item);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_list(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); mgr boolean;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  mgr := me.role in ('admin','accountant');
  return jsonb_build_object('ok', true,
    'me', jsonb_build_object('phone', me.phone, 'name', me.name, 'role', me.role, 'budget', me.budget),
    'custodies', coalesce((select jsonb_agg(public._cust_json(c) order by c.id desc) from public.custodies c where mgr or c.holder = me.phone), '[]'::jsonb),
    'holders', case when mgr then coalesce((select jsonb_agg(jsonb_build_object('phone', m.phone, 'name', m.name, 'role', m.role) order by (m.role <> 'custodian'), m.name) from public.members m), '[]'::jsonb) else '[]'::jsonb end);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_remind(p_token text, p_id bigint, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies; v_inv numeric;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  select * into c from public.custodies where id = p_id for update;
  if c.id is null or c.status <> 'open' then return jsonb_build_object('error','bad_state'); end if;
  if c.reminded_at is not null and c.reminded_at > now() - interval '1 hour' then return jsonb_build_object('error','too_soon'); end if;
  select coalesce(sum(amount),0) into v_inv from public.custody_items where custody_id = c.id;
  update public.custodies set reminded_at = now() where id = c.id;
  perform public._wa_tell(me.phone, c.holder, public._fmt('🔔', 'تذكير بتصفية العهدة',
    public._ln('رقم العهدة', 'ع-' || lpad(c.id::text,4,'0')) || public._ln('الغرض', c.purpose) ||
    public._ln('مبلغ العهدة', public._sar(c.amount)) || public._ln('المتبقي في عهدتك', public._sar(c.amount - v_inv)) ||
    public._ln('ملاحظة', p_note),
    'نرجو رفع الفواتير وتصفية العهدة من النظام.'));
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_request(p_token text, p_amount numeric, p_purpose text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); v_id bigint;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if coalesce(p_amount,0) <= 0 then return jsonb_build_object('error','bad_amount'); end if;
  if coalesce(trim(p_purpose),'') = '' then return jsonb_build_object('error','no_purpose'); end if;
  insert into public.custodies(holder, holder_name, purpose, requested, amount, status, created_by)
  values (me.phone, me.name, trim(p_purpose), round(p_amount,2), round(p_amount,2), 'requested', me.phone) returning id into v_id;
  perform public._notify_mgrs(public._fmt('🆕', 'طلب عهدة جديد',
    public._ln('رقم الطلب', 'ع-' || lpad(v_id::text,4,'0')) || public._ln('مقدّم الطلب', me.name) ||
    public._ln('المبلغ', public._sar(p_amount)) || public._ln('الغرض', p_purpose),
    'افتح النظام لاعتماد الطلب أو رفضه.'), me.phone);
  return jsonb_build_object('ok', true, 'id', v_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_return(p_token text, p_id bigint, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  if coalesce(trim(p_note),'') = '' then return jsonb_build_object('error','no_reason'); end if;
  select * into c from public.custodies where id = p_id for update;
  if c.id is null or c.status <> 'submitted' then return jsonb_build_object('error','bad_state'); end if;
  update public.custodies set status = 'open', note = trim(p_note), submitted_at = null where id = c.id;
  perform public._wa_tell(me.phone, c.holder, public._fmt('↩️', 'أُعيدت لك تصفية العهدة للتعديل',
    public._ln('رقم العهدة', 'ع-' || lpad(c.id::text,4,'0')) || public._ln('السبب', p_note),
    'عدّل الفواتير من النظام ثم أعد إرسال التصفية.'));
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.cust_submit(p_token text, p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.cust_submit_kind(p_token, p_id, 'final') $function$
;

CREATE OR REPLACE FUNCTION public.cust_submit_kind(p_token text, p_id bigint, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); c public.custodies; v_new numeric; v_n int; v_kind text := case when p_kind = 'partial' then 'partial' else 'final' end;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into c from public.custodies where id = p_id for update;
  if c.id is null or c.holder <> me.phone then return jsonb_build_object('error','forbidden'); end if;
  if c.status <> 'open' then return jsonb_build_object('error','bad_state'); end if;
  select coalesce(sum(amount),0), count(*) into v_new, v_n from public.custody_items where custody_id = c.id and not settled and file_data is not null;
  if v_n = 0 and (v_kind = 'partial' or c.settled_total = 0) then return jsonb_build_object('error','no_invoices'); end if;
  update public.custodies set status = 'submitted', submit_kind = v_kind, submitted_at = now() where id = c.id;
  perform public._notify_mgrs(public._fmt('📤', case when v_kind = 'partial' then 'طلب تصفية جزئية' else 'طلب تصفية نهائية' end,
    public._ln('رقم العهدة', 'ع-' || lpad(c.id::text,4,'0')) || public._ln('صاحب العهدة', c.holder_name) ||
    public._ln('مبلغ العهدة', public._sar(c.amount)) || public._ln('فواتير جديدة', public._sar(v_new) || ' (' || v_n || ')') ||
    case when v_kind = 'final' then public._ln('المتبقي للإرجاع', public._sar(c.amount - c.settled_total - v_new)) else '' end,
    'افتح النظام لمراجعة الفواتير واعتماد التصفية.'), me.phone);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.members m where m.phone = public.current_phone() and m.role = 'admin')
$function$
;

CREATE OR REPLACE FUNCTION public.is_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.members m where m.phone = public.current_phone())
$function$
;

CREATE OR REPLACE FUNCTION public.login_request(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_phone text := public._t6(p_phone); v_last timestamptz; v_code text;
begin
  if v_phone is null then return jsonb_build_object('error','bad_phone'); end if;
  if not exists (select 1 from public.members where phone = v_phone) then return public._t5(); end if;
  select sent_at into v_last from public.login_codes where phone = v_phone;
  if v_last is not null and v_last > now() - interval '60 seconds' then return jsonb_build_object('error','too_soon'); end if;
  v_code := public._store_code(v_phone);
  if public._wa_code(v_phone,
       '*' || public._cfg('org_name') || '*' || E'\n' ||
       'رمز الدخول إلى النظام:' || E'\n\n' ||
       '```' || v_code || '```' || E'\n\n' ||
       '⏱ صالح لمدة 5 دقائق' || E'\n' ||
       '🔒 لا تشارك هذا الرمز مع أحد' || E'\n\n' ||
       '_انسخ الرسالة وارجع للموقع، ويُكتب الرمز تلقائيًا._') is null then
    return jsonb_build_object('error','sender_not_configured');
  end if;
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.login_verify(p_phone text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_phone text := public._t6(p_phone); v_res jsonb; v_role text; v_att int;
begin
  select attempts into v_att from public.login_codes where phone = v_phone;
  if coalesce(v_att, 0) > 4 then return jsonb_build_object('error','locked'); end if;
  v_res := public._t3(v_phone, p_code);
  if v_res->>'error' is not null then
    perform public._t1(v_phone);
    return v_res;
  end if;
  perform public._t7(v_phone);
  select role into v_role from public.members where phone = v_phone;
  if v_role is null then return public._t5(); end if;
  return public._t2(v_phone) || jsonb_build_object('role', v_role);
end $function$
;

CREATE OR REPLACE FUNCTION public.logout(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  delete from public.app_sessions where token_hash = public._hash(coalesce(p_token,''));
  select jsonb_build_object('ok', true);
$function$
;

CREATE OR REPLACE FUNCTION public.member_add(p_token text, p_phone text, p_name text, p_role text, p_budget numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_phone text := public._t6(p_phone);
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  if v_phone is null then return jsonb_build_object('error','bad_phone'); end if;
  if exists (select 1 from public.members m where m.phone = v_phone) then return jsonb_build_object('error','exists'); end if;
  insert into public.members(phone, name, role, budget) values (v_phone, coalesce(p_name,''),
    case when p_role in ('admin','accountant','custodian') then p_role else 'staff' end,
    case when p_role = 'accountant' then greatest(round(coalesce(p_budget,0),2),0) else 0 end);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.member_add(p_token text, p_phone text, p_name text, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_phone text := public._t6(p_phone);
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  if v_phone is null then return jsonb_build_object('error','bad_phone'); end if;
  if exists (select 1 from public.members m where m.phone = v_phone) then return jsonb_build_object('error','exists'); end if;
  insert into public.members(phone, name, role) values (v_phone, coalesce(p_name,''), case when p_role = 'admin' then 'admin' else 'staff' end);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.member_remove(p_token text, p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  if p_phone = public._session_phone(p_token) then return jsonb_build_object('error','self'); end if;
  perform public._del_member(p_phone);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.member_update(p_token text, p_phone text, p_name text, p_role text, p_budget numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  if p_phone = public._session_phone(p_token) and p_role <> 'admin' then return jsonb_build_object('error','self'); end if;
  update public.members set name = coalesce(p_name, name),
    role = case when p_role in ('admin','accountant','custodian') then p_role else 'staff' end,
    budget = case when p_role = 'accountant' then greatest(round(coalesce(p_budget,0),2),0) else 0 end
  where phone = p_phone;
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.members_list(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public._is_admin_token(p_token) then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'members',
    coalesce((select jsonb_agg(jsonb_build_object('phone', m.phone, 'name', m.name, 'role', m.role, 'budget', m.budget) order by m.created_at) from public.members m), '[]'::jsonb));
end $function$
;

CREATE OR REPLACE FUNCTION public.msg_list(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'role', me.role,
    'people', coalesce((select jsonb_agg(jsonb_build_object('phone',m.phone,'name',m.name,'role',m.role) order by m.name) from public.members m where m.phone <> me.phone), '[]'::jsonb),
    'log', coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'names',x.names,'n',cardinality(x.recipients),'body',x.body,'created_at',x.created_at,
        'from', coalesce(s.name, x.sent_by), 'mine', x.sent_by = me.phone) order by x.id desc)
      from (select * from public.messages order by id desc limit 50) x left join public.members s on s.phone = x.sent_by), '[]'::jsonb));
end $function$
;

CREATE OR REPLACE FUNCTION public.msg_send(p_token text, p_to text[], p_body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); v_to text[]; v_names text[]; v_text text;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant') then return jsonb_build_object('error','forbidden'); end if;
  if coalesce(trim(p_body),'') = '' then return jsonb_build_object('error','no_body'); end if;
  if length(p_body) > 3000 then return jsonb_build_object('error','too_long'); end if;
  select array_agg(m.phone order by m.name), array_agg(m.name order by m.name) into v_to, v_names
    from public.members m where m.phone = any(p_to) and m.phone <> me.phone;
  if coalesce(cardinality(v_to),0) = 0 then return jsonb_build_object('error','no_recipients'); end if;
  v_text := public._fmt('✉️', 'رسالة من إدارة المجمع', trim(p_body));
  perform public._wa_send(t, v_text) from unnest(v_to) t;
  /* the accountant sees what the manager sent, unless already a recipient */
  perform public._wa_send(m.phone, '📋 _نسخة للإدارة — أُرسلت إلى ' ||
      case when cardinality(v_names) <= 5 then array_to_string(v_names, '، ') else cardinality(v_names) || ' مستخدمين' end || '_' || E'\n\n' || v_text)
    from public.members m where m.role in ('admin','accountant') and m.phone <> me.phone and not (m.phone = any(v_to));
  insert into public.messages(sent_by, recipients, names, body) values (me.phone, v_to, v_names, trim(p_body));
  return jsonb_build_object('ok', true, 'sent', cardinality(v_to));
end $function$
;

CREATE OR REPLACE FUNCTION public.session_info(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_phone text := public._session_phone(p_token); v_role text;
begin
  if v_phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select role into v_role from public.members where phone = v_phone;
  return jsonb_build_object('ok', true, 'phone', v_phone, 'role', v_role);
end $function$
;

CREATE OR REPLACE FUNCTION public.task_add(p_token text, p_assignee text, p_title text, p_details text, p_due date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); a public.members; v_id bigint;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role <> 'admin' then return jsonb_build_object('error','forbidden'); end if;
  select * into a from public.members where phone = p_assignee;
  if a.phone is null then return jsonb_build_object('error','no_assignee'); end if;
  if coalesce(trim(p_title),'') = '' then return jsonb_build_object('error','no_title'); end if;
  insert into public.tasks(title, details, assignee, assignee_name, due, created_by)
  values (trim(p_title), coalesce(trim(p_details),''), a.phone, a.name, p_due, me.phone) returning id into v_id;
  perform public._wa_tell(me.phone, a.phone, public._fmt('📌', 'مهمة جديدة لك',
    public._ln('المهمة', p_title) || public._ln('التفاصيل', p_details) || public._ln('المطلوب قبل', to_char(p_due,'YYYY/MM/DD')),
    'عند إنجازها اضغط «تم الإنجاز» من النظام.'));
  return jsonb_build_object('ok',true,'id',v_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.task_del(p_token text, p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role <> 'admin' then return jsonb_build_object('error','forbidden'); end if;
  perform public._task_rm(p_id);
  return jsonb_build_object('ok',true);
end $function$
;

CREATE OR REPLACE FUNCTION public.task_done(p_token text, p_id bigint, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); t public.tasks;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into t from public.tasks where id = p_id for update;
  if t.id is null or (t.assignee <> me.phone and me.role <> 'admin') then return jsonb_build_object('error','forbidden'); end if;
  if t.status <> 'open' then return jsonb_build_object('error','bad_state'); end if;
  update public.tasks set status = 'done', done_note = coalesce(trim(p_note),''), done_at = now() where id = t.id;
  perform public._notify_mgrs(public._fmt('✅', 'أُنجزت مهمة',
    public._ln('المهمة', t.title) || public._ln('بواسطة', t.assignee_name) || public._ln('ملاحظة', p_note)), me.phone);
  return jsonb_build_object('ok',true);
end $function$
;

CREATE OR REPLACE FUNCTION public.task_list(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  return jsonb_build_object('ok',true,'role',me.role,
    'tasks', coalesce((select jsonb_agg(public._task_json(t) order by (t.status='done'), t.due nulls last, t.id desc)
      from public.tasks t where me.role in ('admin','accountant') or t.assignee = me.phone), '[]'::jsonb),
    'people', case when me.role = 'admin' then coalesce((select jsonb_agg(jsonb_build_object('phone',m.phone,'name',m.name,'role',m.role) order by m.name)
      from public.members m where m.phone <> me.phone), '[]'::jsonb) else '[]'::jsonb end);
end $function$
;

CREATE OR REPLACE FUNCTION public.task_reopen(p_token text, p_id bigint, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me public.members := public._me(p_token); t public.tasks;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role <> 'admin' then return jsonb_build_object('error','forbidden'); end if;
  if coalesce(trim(p_note),'') = '' then return jsonb_build_object('error','no_reason'); end if;
  select * into t from public.tasks where id = p_id for update;
  if t.id is null or t.status <> 'done' then return jsonb_build_object('error','bad_state'); end if;
  update public.tasks set status = 'open', done_at = null, done_note = '' where id = t.id;
  perform public._wa_tell(me.phone, t.assignee, public._fmt('↩️', 'أُعيدت لك مهمة',
    public._ln('المهمة', t.title) || public._ln('الملاحظة', p_note),
    'أكمل المطلوب ثم اضغط «تم الإنجاز» من النظام.'));
  return jsonb_build_object('ok',true);
end $function$
;

CREATE OR REPLACE FUNCTION public.touch_doc()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $function$
;
;

-- trigger
create trigger docs_touch before insert or update on public.docs for each row execute function public.touch_doc();

-- grants: only the API functions are callable from the site
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(array['app_delete','app_load','app_put','cust_cancel','cust_close','cust_decide','cust_file','cust_issue','cust_item_add','cust_item_del','cust_list','cust_remind','cust_request','cust_return','cust_submit','cust_submit_kind','login_request','login_verify','logout','member_add','member_remove','member_update','members_list','msg_list','msg_send','session_info','task_add','task_del','task_done','task_list','task_reopen']) loop
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop; end $$;

-- WhatsApp queue pump (every 2 seconds)
select cron.schedule('wa-pump-public', '2 seconds', 'select public._wa_pump()');
