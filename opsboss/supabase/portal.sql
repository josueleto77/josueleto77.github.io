-- ============================================================
-- OpsBoss — Portal del cliente (firma electrónica + pagos en línea)
-- Already installed on the "opsboss" project. To reinstall, run it
-- AFTER schema.sql (it uses the opsboss_private functions).
-- ============================================================

-- Links secretos del portal (uno por documento; vencen a los 90 días)
create table if not exists public.opsboss_portal_links (
  token text primary key,
  kind text not null check (kind in ('estimate', 'invoice')),
  record_id text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  revoked boolean not null default false,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0
);
create index if not exists opsboss_portal_links_rec_idx on public.opsboss_portal_links (kind, record_id);
create index if not exists opsboss_portal_links_created_by_idx on public.opsboss_portal_links (created_by);

-- Bitácora de lo que hace el cliente: firmas (con IP y navegador), rechazos y pagos
create table if not exists public.opsboss_portal_events (
  id bigint generated always as identity primary key,
  token text references public.opsboss_portal_links(token) on delete set null,
  kind text not null,
  record_id text not null,
  event text not null,
  signer_name text,
  signature text,
  option_index integer,
  amount numeric,
  reason text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists opsboss_portal_events_rec_idx on public.opsboss_portal_events (kind, record_id);
create index if not exists opsboss_portal_events_token_idx on public.opsboss_portal_events (token);

-- Candados: evitan que dos miembros procesen la misma aprobación/pago
create table if not exists public.opsboss_locks (
  key text primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists opsboss_locks_user_idx on public.opsboss_locks (user_id);

alter table public.opsboss_portal_links enable row level security;
alter table public.opsboss_portal_events enable row level security;
alter table public.opsboss_locks enable row level security;

drop policy if exists "opsboss_portal_links_select" on public.opsboss_portal_links;
create policy "opsboss_portal_links_select" on public.opsboss_portal_links for select to authenticated
  using ((select opsboss_private.opsboss_is_member()));
drop policy if exists "opsboss_portal_links_update" on public.opsboss_portal_links;
create policy "opsboss_portal_links_update" on public.opsboss_portal_links for update to authenticated
  using ((select opsboss_private.opsboss_is_member())) with check ((select opsboss_private.opsboss_is_member()));
drop policy if exists "opsboss_portal_events_select" on public.opsboss_portal_events;
create policy "opsboss_portal_events_select" on public.opsboss_portal_events for select to authenticated
  using ((select opsboss_private.opsboss_is_member()));
-- opsboss_locks: sin políticas (solo vía opsboss_lock()).

-- ---------- Auxiliares privados ----------
create or replace function opsboss_private.items_total(p_items jsonb, p_tax numeric) returns numeric
language sql immutable set search_path = public as $$
  select coalesce(sum(coalesce(nullif(i->>'qty', '')::numeric, 0) * coalesce(nullif(i->>'price', '')::numeric, 0)), 0) * (1 + coalesce(p_tax, 0) / 100)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i;
$$;

create or replace function opsboss_private.strip_items(p_items jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(i - 'cost'), '[]'::jsonb) from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i;
$$;

create or replace function opsboss_private.link_for(p_kind text, p_id text) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  select token into v_token from public.opsboss_portal_links
    where kind = p_kind and record_id = p_id and not revoked and expires_at > now() + interval '7 days'
    order by created_at desc limit 1;
  if v_token is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.opsboss_portal_links (token, kind, record_id) values (v_token, p_kind, p_id);
  end if;
  return v_token;
end;
$$;

create or replace function opsboss_private.now_iso() returns text
language sql stable set search_path = public as $$ select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); $$;

create or replace function opsboss_private.req_meta() returns jsonb
language plpgsql stable set search_path = public as $$
declare h json;
begin
  begin h := nullif(current_setting('request.headers', true), '')::json; exception when others then h := null; end;
  return jsonb_build_object('ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1), 'ua', left(coalesce(h->>'user-agent', ''), 300));
end;
$$;

-- ---------- Equipo: crear/obtener link del portal ----------
create or replace function public.opsboss_portal_link(p_kind text, p_id text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not opsboss_private.opsboss_is_member() then raise exception 'not allowed'; end if;
  if p_kind not in ('estimate', 'invoice') then raise exception 'bad kind'; end if;
  if not exists (select 1 from public.opsboss_records where coll = case p_kind when 'estimate' then 'estimates' else 'invoices' end and id = p_id) then
    raise exception 'record not found';
  end if;
  return opsboss_private.link_for(p_kind, p_id);
end;
$$;

-- ---------- Equipo: candado de procesamiento ----------
create or replace function public.opsboss_lock(p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not opsboss_private.opsboss_is_member() then raise exception 'not allowed'; end if;
  insert into public.opsboss_locks (key) values (left(p_key, 200)) on conflict (key) do nothing;
  return found;
end;
$$;

-- ---------- Cliente (anónimo, con token): leer documento sin costos ----------
create or replace function public.opsboss_portal_get(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l record; r jsonb; s jsonb; c jsonb; out jsonb; v_dep_token text;
begin
  select * into l from public.opsboss_portal_links where token = p_token;
  if l.token is null or l.revoked or l.expires_at < now() then return jsonb_build_object('error', 'invalid'); end if;
  select data into r from public.opsboss_records where coll = case l.kind when 'estimate' then 'estimates' else 'invoices' end and id = l.record_id;
  if r is null then return jsonb_build_object('error', 'missing'); end if;
  select data into s from public.opsboss_records where coll = 'settings' and id = 'main';
  select data into c from public.opsboss_records where coll = 'customers' and id = r->>'customerId';
  update public.opsboss_portal_links set view_count = view_count + 1, last_viewed_at = now(), first_viewed_at = coalesce(first_viewed_at, now()) where token = p_token;

  out := jsonb_build_object(
    'kind', l.kind,
    'company', jsonb_build_object('name', s->>'company', 'phone', s->>'phone', 'email', s->>'email', 'address', s->>'address', 'license', s->>'license', 'terms', s->>'terms',
      'taxRate', coalesce(nullif(s->>'taxRate', '')::numeric, 0), 'apr', coalesce(nullif(s->>'apr', '')::numeric, 0), 'term', coalesce(nullif(s->>'term', '')::numeric, 0),
      'paymentsEnabled', coalesce((s->>'paymentsEnabled')::boolean, false), 'payInstructions', s->>'payInstructions'),
    'customer', jsonb_build_object('name', c->>'name', 'address', c->>'address', 'city', c->>'city', 'zip', c->>'zip', 'email', c->>'email', 'phone', c->>'phone'));

  if l.kind = 'estimate' then
    if r->>'depositInvoiceId' is not null then v_dep_token := opsboss_private.link_for('invoice', r->>'depositInvoiceId'); end if;
    out := out || jsonb_build_object('depositToken', v_dep_token, 'record', jsonb_build_object(
      'number', r->'number', 'title', r->'title', 'division', r->'division', 'status', r->'status', 'createdAt', r->'createdAt', 'validUntil', r->'validUntil',
      'notes', r->'notes', 'deposit', r->'deposit', 'selected', r->'selected', 'signedBy', r->'signedBy', 'signedAt', r->'signedAt',
      'options', (select coalesce(jsonb_agg(jsonb_build_object('name', o->'name', 'items', opsboss_private.strip_items(o->'items')) order by ord), '[]'::jsonb)
                  from jsonb_array_elements(coalesce(r->'options', '[]'::jsonb)) with ordinality as t(o, ord))));
  else
    out := out || jsonb_build_object('record', jsonb_build_object(
      'number', r->'number', 'status', r->'status', 'createdAt', r->'createdAt', 'due', r->'due', 'notes', r->'notes', 'kind', r->'kind',
      'items', opsboss_private.strip_items(r->'items'),
      'payments', (select coalesce(jsonb_agg(jsonb_build_object('amount', p->'amount', 'date', p->'date', 'method', p->'method')), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(r->'payments', '[]'::jsonb)) p)));
  end if;
  return out;
end;
$$;

-- ---------- Cliente: aprobar con firma (crea la factura de depósito) ----------
create or replace function public.opsboss_portal_approve(p_token text, p_option integer, p_name text, p_signature text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l record; r jsonb; s jsonb; v_tax numeric; v_total numeric; v_dep numeric; v_n integer; v_inv_id text; v_now text := opsboss_private.now_iso(); v_dep_token text; m jsonb := opsboss_private.req_meta();
begin
  select * into l from public.opsboss_portal_links where token = p_token;
  if l.token is null or l.revoked or l.expires_at < now() or l.kind <> 'estimate' then return jsonb_build_object('error', 'invalid'); end if;
  select data into r from public.opsboss_records where coll = 'estimates' and id = l.record_id for update;
  if r is null then return jsonb_build_object('error', 'missing'); end if;
  if r->>'status' = 'approved' then return jsonb_build_object('error', 'already'); end if;
  if r->>'status' not in ('sent', 'draft') then return jsonb_build_object('error', 'closed'); end if;
  if nullif(r->>'validUntil', '') is not null and (r->>'validUntil')::date < current_date then return jsonb_build_object('error', 'expired'); end if;
  if p_option is null or p_option < 0 or p_option >= jsonb_array_length(coalesce(r->'options', '[]'::jsonb)) then return jsonb_build_object('error', 'option'); end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 120 then return jsonb_build_object('error', 'name'); end if;
  if p_signature is null or p_signature not like 'data:image/png;base64,%' or length(p_signature) > 400000 then return jsonb_build_object('error', 'signature'); end if;

  select data into s from public.opsboss_records where coll = 'settings' and id = 'main';
  v_tax := coalesce(nullif(s->>'taxRate', '')::numeric, 0);
  v_total := round(opsboss_private.items_total(r->'options'->p_option->'items', v_tax), 2);
  r := r || jsonb_build_object('status', 'approved', 'selected', p_option, 'approvedAt', v_now, 'approvedVia', 'portal', 'signedBy', trim(p_name), 'signedAt', v_now);

  if coalesce(nullif(r->>'deposit', '')::numeric, 0) > 0 and v_total > 0 then
    v_dep := round(v_total * (r->>'deposit')::numeric / 100, 2);
    select greatest(coalesce(nullif(s->'counters'->>'inv', '')::integer, 0), coalesce(max(nullif(regexp_replace(data->>'number', '\D', '', 'g'), '')::integer), 0)) + 1
      into v_n from public.opsboss_records where coll = 'invoices';
    v_inv_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    insert into public.opsboss_records (coll, id, data) values ('invoices', v_inv_id, jsonb_build_object(
      'id', v_inv_id, 'number', 'INV-' || v_n, 'customerId', r->'customerId', 'jobId', null, 'division', r->'division',
      'items', jsonb_build_array(jsonb_build_object('id', substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
        'name', 'Deposit ' || (r->>'deposit') || '% — ' || (r->>'number') || ' ' || coalesce(r->>'title', ''), 'qty', 1, 'price', v_dep / (1 + v_tax / 100), 'cost', 0)),
      'status', 'sent', 'createdAt', v_now, 'due', to_char(current_date, 'YYYY-MM-DD'), 'payments', '[]'::jsonb, 'notes', '', 'estimateId', l.record_id, 'kind', 'deposit'));
    update public.opsboss_records set data = jsonb_set(data, '{counters,inv}', to_jsonb(v_n)) where coll = 'settings' and id = 'main' and data ? 'counters';
    r := r || jsonb_build_object('depositInvoiceId', v_inv_id);
    v_dep_token := opsboss_private.link_for('invoice', v_inv_id);
  end if;

  update public.opsboss_records set data = r where coll = 'estimates' and id = l.record_id;
  insert into public.opsboss_portal_events (token, kind, record_id, event, signer_name, signature, option_index, amount, ip, user_agent)
    values (p_token, 'estimate', l.record_id, 'approved', trim(p_name), p_signature, p_option, v_total, m->>'ip', m->>'ua');
  return jsonb_build_object('ok', true, 'depositToken', v_dep_token, 'deposit', v_dep, 'total', v_total);
end;
$$;

-- ---------- Cliente: rechazar ----------
create or replace function public.opsboss_portal_decline(p_token text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l record; r jsonb; m jsonb := opsboss_private.req_meta();
begin
  select * into l from public.opsboss_portal_links where token = p_token;
  if l.token is null or l.revoked or l.expires_at < now() or l.kind <> 'estimate' then return jsonb_build_object('error', 'invalid'); end if;
  select data into r from public.opsboss_records where coll = 'estimates' and id = l.record_id for update;
  if r is null then return jsonb_build_object('error', 'missing'); end if;
  if r->>'status' not in ('sent', 'draft') then return jsonb_build_object('error', 'closed'); end if;
  update public.opsboss_records set data = r || jsonb_build_object('status', 'declined', 'declinedAt', opsboss_private.now_iso(), 'declinedVia', 'portal', 'declineReason', left(coalesce(p_reason, ''), 1000))
    where coll = 'estimates' and id = l.record_id;
  insert into public.opsboss_portal_events (token, kind, record_id, event, reason, ip, user_agent)
    values (p_token, 'estimate', l.record_id, 'declined', left(coalesce(p_reason, ''), 1000), m->>'ip', m->>'ua');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- Servidor (webhook de Stripe): registrar pago, idempotente ----------
create or replace function public.opsboss_portal_record_payment(p_invoice_id text, p_amount numeric, p_ref text, p_method text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  select data into r from public.opsboss_records where coll = 'invoices' and id = p_invoice_id for update;
  if r is null then return jsonb_build_object('error', 'missing'); end if;
  if exists (select 1 from jsonb_array_elements(coalesce(r->'payments', '[]'::jsonb)) p where p->>'ref' = p_ref) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  r := jsonb_set(r, '{payments}', coalesce(r->'payments', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'id', substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), 'amount', p_amount, 'date', opsboss_private.now_iso(), 'method', coalesce(p_method, 'Online payment'), 'ref', p_ref, 'online', true)));
  if r->>'status' = 'draft' then r := r || jsonb_build_object('status', 'sent'); end if;
  update public.opsboss_records set data = r where coll = 'invoices' and id = p_invoice_id;
  insert into public.opsboss_portal_events (kind, record_id, event, amount) values ('invoice', p_invoice_id, 'paid', p_amount);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- Permisos ----------
revoke all on function opsboss_private.items_total(jsonb, numeric) from public, anon, authenticated;
revoke all on function opsboss_private.strip_items(jsonb) from public, anon, authenticated;
revoke all on function opsboss_private.link_for(text, text) from public, anon, authenticated;
revoke all on function opsboss_private.now_iso() from public, anon, authenticated;
revoke all on function opsboss_private.req_meta() from public, anon, authenticated;
revoke all on function public.opsboss_portal_link(text, text) from public, anon;
grant execute on function public.opsboss_portal_link(text, text) to authenticated;
revoke all on function public.opsboss_lock(text) from public, anon;
grant execute on function public.opsboss_lock(text) to authenticated;
revoke all on function public.opsboss_portal_get(text) from public;
grant execute on function public.opsboss_portal_get(text) to anon, authenticated;
revoke all on function public.opsboss_portal_approve(text, integer, text, text) from public;
grant execute on function public.opsboss_portal_approve(text, integer, text, text) to anon, authenticated;
revoke all on function public.opsboss_portal_decline(text, text) from public;
grant execute on function public.opsboss_portal_decline(text, text) to anon, authenticated;
revoke all on function public.opsboss_portal_record_payment(text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.opsboss_portal_record_payment(text, numeric, text, text) to service_role;
