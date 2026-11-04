-- الصلاحيات الجديدة (إداري، دعم فني)، المسمى الوظيفي، سجل التعديلات، النسخ الاحتياطي

-- 1) الأدوار والمسمى
alter table public.members add column if not exists title text;
alter table public.members drop constraint if exists members_role_check;
alter table public.members add constraint members_role_check check (role in ('admin','staff','accountant','custodian','tech'));

-- 2) _me يحفظ من ينفذ العملية لسجل التعديلات
create or replace function public._me(p_token text) returns public.members
language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where phone = public._session_phone(p_token);
  if m.phone is not null then perform set_config('app.actor', m.phone, true); end if;
  return m;
end $$;

-- 3) سجل التعديلات
create table if not exists public.audit_log(
  id bigserial primary key, at timestamptz not null default now(),
  actor text, actor_name text, entity text not null, entity_id text, action text not null, old jsonb, new jsonb);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
create index if not exists audit_log_at on public.audit_log(at desc);

create or replace function public._audit(p_entity text, p_id text, p_action text, p_old jsonb, p_new jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare a text := nullif(current_setting('app.actor', true), '');
begin
  insert into public.audit_log(actor, actor_name, entity, entity_id, action, old, new)
  values (a, (select name from public.members where phone = a), p_entity, p_id, p_action, p_old, p_new);
end $$;

create or replace function public._trg_docs() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public._audit(new.collection, new.id, 'add', null, new.data);
  elsif tg_op = 'UPDATE' then
    if new.data is distinct from old.data then perform public._audit(new.collection, new.id, 'edit', old.data, new.data); end if;
  else perform public._audit(old.collection, old.id, 'delete', old.data, null); end if;
  return null;
end $$;
drop trigger if exists audit_docs on public.docs;
create trigger audit_docs after insert or update or delete on public.docs for each row execute function public._trg_docs();

create or replace function public._cust_sub(c public.custodies) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('no', 'ع-' || lpad(c.id::text,4,'0'), 'holder_name', c.holder_name, 'purpose', c.purpose,
    'requested', c.requested, 'amount', c.amount, 'status', c.status, 'note', c.note, 'settled_total', c.settled_total)
$$;
create or replace function public._trg_cust() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public._audit('custodies', new.id::text, 'add', null, public._cust_sub(new));
  elsif tg_op = 'UPDATE' then
    if (new.status, new.amount, new.purpose, new.settled_total) is distinct from (old.status, old.amount, old.purpose, old.settled_total) then
      perform public._audit('custodies', new.id::text, 'edit', public._cust_sub(old), public._cust_sub(new)); end if;
  else perform public._audit('custodies', old.id::text, 'delete', public._cust_sub(old), null); end if;
  return null;
end $$;
drop trigger if exists audit_cust on public.custodies;
create trigger audit_cust after insert or update or delete on public.custodies for each row execute function public._trg_cust();

create or replace function public._mem_sub(m public.members) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('phone', m.phone, 'name', m.name, 'role', m.role, 'title', m.title, 'email', m.email, 'budget', m.budget)
$$;
create or replace function public._trg_mem() returns trigger language plpgsql security definer set search_path = '' as $$
declare op boolean := current_setting('app.op', true) = 'member'; o jsonb; n jsonb;
begin
  if tg_op = 'INSERT' then perform public._audit('members', new.phone, 'add', null, public._mem_sub(new));
  elsif tg_op = 'UPDATE' then
    o := public._mem_sub(old); n := public._mem_sub(new);
    if (o - 'budget') is distinct from (n - 'budget') or (op and new.budget is distinct from old.budget) or (op and new.pw_hash is distinct from old.pw_hash) then
      if op and new.pw_hash is distinct from old.pw_hash then n := n || '{"pw_reset":true}'; end if;
      perform public._audit('members', new.phone, 'edit', o, n);
    end if;
  else perform public._audit('members', old.phone, 'delete', public._mem_sub(old), null); end if;
  return null;
end $$;
drop trigger if exists audit_mem on public.members;
create trigger audit_mem after insert or update or delete on public.members for each row execute function public._trg_mem();

create or replace function public._trg_task() returns trigger language plpgsql security definer set search_path = '' as $$
declare s jsonb;
begin
  if tg_op = 'DELETE' then
    perform public._audit('tasks', old.id::text, 'delete', jsonb_build_object('title', old.title, 'assignee_name', old.assignee_name, 'status', old.status), null);
    return null; end if;
  s := jsonb_build_object('title', new.title, 'assignee_name', new.assignee_name, 'status', new.status, 'due', new.due, 'done_note', new.done_note);
  if tg_op = 'INSERT' then perform public._audit('tasks', new.id::text, 'add', null, s);
  elsif new.status is distinct from old.status then
    perform public._audit('tasks', new.id::text, 'edit', jsonb_build_object('title', old.title, 'assignee_name', old.assignee_name, 'status', old.status), s); end if;
  return null;
end $$;
drop trigger if exists audit_task on public.tasks;
create trigger audit_task after insert or update or delete on public.tasks for each row execute function public._trg_task();

revoke execute on function public._audit(text,text,text,jsonb,jsonb), public._trg_docs(), public._trg_cust(), public._trg_mem(), public._trg_task(),
  public._cust_sub(public.custodies), public._mem_sub(public.members) from public, anon, authenticated;

create or replace function public.audit_list(p_token text, p_before bigint default null, p_entity text default null, p_actor text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role <> 'admin' then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'at', a.at, 'actor', a.actor, 'actor_name', coalesce(a.actor_name, m.name),
        'entity', a.entity, 'entity_id', a.entity_id, 'action', a.action, 'old', a.old, 'new', a.new) order by a.id desc)
      from (select * from public.audit_log l
            where (p_before is null or l.id < p_before) and (p_entity is null or l.entity = p_entity) and (p_actor is null or l.actor = p_actor)
            order by l.id desc limit 60) a left join public.members m on m.phone = a.actor), '[]'::jsonb),
    'actors', coalesce((select jsonb_agg(jsonb_build_object('phone', x.actor, 'name', coalesce(m.name, x.actor)) order by m.name)
      from (select distinct actor from public.audit_log where actor is not null) x left join public.members m on m.phone = x.actor), '[]'::jsonb));
end $$;

-- 4) البيانات المالية: من يعدّل ماذا
create or replace function public.app_load(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant','staff') then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'docs',
    coalesce((select jsonb_agg(jsonb_build_object('c', d.collection, 'id', d.id, 'd', d.data)) from public.docs d), '[]'::jsonb));
end $$;

create or replace function public.app_put(p_token text, p_collection text, p_id text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); v_old jsonb; v_delta numeric; v_data jsonb := p_data;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant','staff') then return jsonb_build_object('error','forbidden'); end if;
  select data into v_old from public.docs where collection = p_collection and id = p_id;
  if p_collection = 'transactions' then
    if v_old is not null and me.role <> 'admin' and coalesce(v_old->>'createdBy','') <> me.phone then
      return jsonb_build_object('error','not_yours'); end if;
    v_data := v_data || jsonb_build_object('createdBy', coalesce(nullif(v_old->>'createdBy',''), me.phone));
    if me.role = 'accountant' then
      v_delta := public._cost(v_data) - public._cost(v_old);
      if v_delta > me.budget then return jsonb_build_object('error','over_budget', 'budget', me.budget); end if;
      if v_delta <> 0 then perform public._budget_add(me.phone, -v_delta); end if;
    end if;
  end if;
  insert into public.docs(collection, id, data) values (p_collection, p_id, v_data)
  on conflict (collection, id) do update set data = excluded.data;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.app_delete(p_token text, p_collection text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); v_old jsonb;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant','staff') then return jsonb_build_object('error','forbidden'); end if;
  if p_collection = 'transactions' and me.role <> 'admin' then
    select data into v_old from public.docs where collection = p_collection and id = p_id;
    if not coalesce((v_old->>'sample')::boolean, false) then return jsonb_build_object('error','no_delete'); end if;
  end if;
  perform public._del_doc(p_collection, p_id);
  return jsonb_build_object('ok', true);
end $$;

-- 5) مكافآت المعلمين: للماليين فقط
create or replace function public.reward_list(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','accountant','staff') then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'receipts', coalesce((select jsonb_agg(jsonb_build_object(
    'tx_id', r.tx_id, 'url', public._receipt_url(r.token), 'sent_at', r.sent_at, 'confirmed_at', r.confirmed_at, 'confirmed_name', r.confirmed_name))
    from public.reward_receipts r), '[]'::jsonb));
end $$;

do $$ declare d text; begin
  select pg_get_functiondef('public.reward_link(text,text,boolean,text)'::regprocedure) into d;
  d := replace(d, $q$if me.role = 'custodian' then$q$, $q$if me.role not in ('admin','accountant','staff') then$q$);
  execute d;
end $$;

-- 6) إعدادات النظام: المدير والدعم الفني
do $$ declare f text; d text; begin
  foreach f in array array['public.brand_set(text,text,text,text,text,text)','public.config_get(text)','public.config_set(text,text,text,text)','public.wa_test(text)','public.wa_status(text,bigint)'] loop
    select pg_get_functiondef(f::regprocedure) into d;
    d := replace(d, $q$if me.role <> 'admin' then$q$, $q$if me.role not in ('admin','tech') then$q$);
    execute d;
  end loop;
end $$;

-- 7) المستخدمون: المدير يدير الكل، والدعم الفني يدير الإداريين والدعم الفني فقط
drop function if exists public.member_add(text,text,text,text,numeric,text,text);
drop function if exists public.member_update(text,text,text,text,numeric,text,text);

create or replace function public.members_list(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role not in ('admin','tech') then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true, 'members',
    coalesce((select jsonb_agg(jsonb_build_object('phone', m.phone, 'name', m.name, 'role', m.role, 'title', m.title, 'budget', m.budget, 'email', m.email,
      'has_password', m.pw_hash is not null,
      'init_password', case when m.pw_init is not null then extensions.pgp_sym_decrypt(m.pw_init, public._pw_key()) end)
      order by m.created_at) from public.members m where me.role = 'admin' or m.role in ('custodian','tech')), '[]'::jsonb));
end $$;

create or replace function public.member_add(p_token text, p_phone text, p_name text, p_role text, p_budget numeric,
  p_password text default null, p_email text default null, p_title text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); v_phone text := public._t6(p_phone);
  v_role text := case when p_role in ('admin','accountant','custodian','tech','staff') then p_role else 'custodian' end;
begin
  if me.phone is null or me.role not in ('admin','tech') then return jsonb_build_object('error','forbidden'); end if;
  if me.role = 'tech' and v_role not in ('custodian','tech') then return jsonb_build_object('error','forbidden'); end if;
  if v_phone is null then return jsonb_build_object('error','bad_phone'); end if;
  if nullif(p_password,'') is not null and not public._pw_ok(p_password) then return jsonb_build_object('error','bad_password'); end if;
  if nullif(trim(p_email),'') is not null and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('error','bad_email'); end if;
  if exists (select 1 from public.members m where m.phone = v_phone) then return jsonb_build_object('error','exists'); end if;
  perform set_config('app.op', 'member', true);
  insert into public.members(phone, name, role, budget, email, title) values (v_phone, coalesce(trim(p_name),''), v_role,
    case when v_role = 'accountant' then greatest(round(coalesce(p_budget,0),2),0) else 0 end,
    nullif(lower(trim(p_email)),''), nullif(left(trim(coalesce(p_title,'')),60),''));
  if nullif(p_password,'') is not null then perform public._pw_set(v_phone, p_password, true); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.member_update(p_token text, p_phone text, p_name text, p_role text, p_budget numeric,
  p_password text default null, p_email text default null, p_title text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); t public.members;
  v_role text := case when p_role in ('admin','accountant','custodian','tech','staff') then p_role else 'custodian' end;
begin
  if me.phone is null or me.role not in ('admin','tech') then return jsonb_build_object('error','forbidden'); end if;
  select * into t from public.members where phone = p_phone;
  if t.phone is null then return jsonb_build_object('error','not_found'); end if;
  if me.role = 'tech' and (t.role not in ('custodian','tech') or v_role not in ('custodian','tech')) then return jsonb_build_object('error','forbidden'); end if;
  if p_phone = me.phone and v_role <> me.role then return jsonb_build_object('error','self'); end if;
  if nullif(p_password,'') is not null and not public._pw_ok(p_password) then return jsonb_build_object('error','bad_password'); end if;
  if nullif(trim(p_email),'') is not null and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('error','bad_email'); end if;
  perform set_config('app.op', 'member', true);
  update public.members set name = coalesce(trim(p_name), name), email = nullif(lower(trim(p_email)),''), role = v_role,
    title = nullif(left(trim(coalesce(p_title,'')),60),''),
    budget = case when v_role = 'accountant' then greatest(round(coalesce(p_budget,0),2),0) else 0 end
  where phone = p_phone;
  if nullif(p_password,'') is not null then perform public._pw_set(p_phone, p_password, p_phone <> me.phone); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.member_remove(p_token text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); t public.members;
begin
  if me.phone is null or me.role not in ('admin','tech') then return jsonb_build_object('error','forbidden'); end if;
  if p_phone = me.phone then return jsonb_build_object('error','self'); end if;
  select * into t from public.members where phone = p_phone;
  if me.role = 'tech' and t.role not in ('custodian','tech') then return jsonb_build_object('error','forbidden'); end if;
  perform public._del_member(p_phone);
  return jsonb_build_object('ok', true);
end $$;

-- 8) بيانات الجلسة والملف الشخصي تشمل المسمى
create or replace function public.session_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_phone text := public._session_phone(p_token); m public.members;
begin
  if v_phone is null then return jsonb_build_object('error','invalid_session'); end if;
  select * into m from public.members where phone = v_phone;
  return jsonb_build_object('ok', true, 'phone', v_phone, 'role', m.role, 'name', m.name, 'title', m.title,
    'has_password', m.pw_hash is not null, 'password_from_admin', m.pw_init is not null);
end $$;

do $$ declare d text; begin
  select pg_get_functiondef('public.my_profile(text)'::regprocedure) into d;
  d := replace(d, $q$'role', me.role, 'budget'$q$, $q$'role', me.role, 'title', me.title, 'budget'$q$);
  execute d;
end $$;

-- 9) النسخ الاحتياطي: نسخة أسبوعية داخل القاعدة + تنزيل نسخة كاملة للمدير
create table if not exists public.backups(id bigserial primary key, at timestamptz not null default now(), kind text not null, by text, size int, data jsonb);
alter table public.backups enable row level security;
revoke all on public.backups from anon, authenticated;

create or replace function public._backup_json() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'format', 'halaqat-backup-1', 'exported_at', now(), 'org_name', public._cfg('org_name'),
    'docs', coalesce((select jsonb_agg(jsonb_build_object('collection', d.collection, 'id', d.id, 'data', d.data)) from public.docs d), '[]'),
    'members', coalesce((select jsonb_agg(public._mem_sub(m) || jsonb_build_object('created_at', m.created_at)) from public.members m), '[]'),
    'custodies', coalesce((select jsonb_agg(to_jsonb(c)) from public.custodies c), '[]'),
    'custody_items', coalesce((select jsonb_agg(to_jsonb(i) - 'file_data' || jsonb_build_object('has_file', i.file_data is not null)) from public.custody_items i), '[]'),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t)) from public.tasks t), '[]'),
    'messages', coalesce((select jsonb_agg(to_jsonb(x)) from public.messages x), '[]'),
    'reward_receipts', coalesce((select jsonb_agg(to_jsonb(r) - 'token') from public.reward_receipts r), '[]'),
    'audit_log', coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.audit_log order by id desc limit 5000) a), '[]'))
$$;
revoke execute on function public._backup_json() from public, anon, authenticated;

create or replace function public._backup_weekly() returns void language plpgsql security definer set search_path = '' as $$
declare j jsonb := public._backup_json();
begin
  insert into public.backups(kind, size, data) values ('weekly', length(j::text), j);
  delete from public.backups where kind = 'weekly' and id not in (select id from public.backups where kind = 'weekly' order by id desc limit 8);
end $$;
revoke execute on function public._backup_weekly() from public, anon, authenticated;

create or replace function public.backup_info(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token);
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role <> 'admin' then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('ok', true,
    'list', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'at', b.at, 'kind', b.kind, 'size', b.size, 'by', coalesce(m.name, b.by)) order by b.id desc)
      from public.backups b left join public.members m on m.phone = b.by), '[]'),
    'last_download', (select max(at) from public.backups where kind = 'download'));
end $$;

create or replace function public.backup_get(p_token text, p_id bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me public.members := public._me(p_token); j jsonb;
begin
  if me.phone is null then return jsonb_build_object('error','invalid_session'); end if;
  if me.role <> 'admin' then return jsonb_build_object('error','forbidden'); end if;
  if p_id is null then
    j := public._backup_json();
    insert into public.backups(kind, by, size) values ('download', me.phone, length(j::text));
  else
    select data into j from public.backups where id = p_id and kind = 'weekly';
    if j is null then return jsonb_build_object('error','not_found'); end if;
  end if;
  return jsonb_build_object('ok', true, 'backup', j);
end $$;

do $$ begin
  perform cron.unschedule('halaqat-weekly-backup') where exists (select 1 from cron.job where jobname = 'halaqat-weekly-backup');
  perform cron.schedule('halaqat-weekly-backup', '0 0 * * 5', 'select public._backup_weekly()');
end $$;
select public._backup_weekly();
