-- ============================================================
-- OpsBoss — Permisos por rol aplicados en el servidor + auditoría
-- Run AFTER schema.sql, portal.sql and phase4.sql. Already applied to the "opsboss" project.
--
-- Lectura por colección:
--   ledger, comp (tarifas y comisiones por proyecto), settings/private (reglas de comisión, tarifas por técnico)
--       → owner, admin, finance
--   pos, bills, exceptions → owner, admin, finance, ops, purchasing
--   runs → los mismos, o quien la generó
--   sub (subcontratista) → solo sus trabajos asignados y lo que cuelga de ellos (cliente, tareas, permisos,
--       garantías, tickets asignados), más settings/main y techs.
--   resto → todos los miembros
-- Escritura: igual que lectura, y además en el servidor:
--   settings/main: solo owner/admin/finance; para el resto solo se aceptan los contadores.
--   jobs: las tarifas de mano de obra y las comisiones se guardan aparte (comp); el proyecto solo lleva totales.
--         Quien no es owner/admin/finance no puede cambiar el presupuesto bloqueado ni aprobar órdenes de cambio.
--   pos: quien no es owner/admin/finance no puede aprobar ni cambiar el monto de una orden aprobada.
--   customers (sub): solo puede agregar equipo instalado.
-- Auditoría: opsboss_audit guarda quién cambió etapas, estados, costos, cobros, aprobaciones, tarifas y comisiones.
-- ============================================================

alter table public.opsboss_records drop constraint if exists opsboss_records_coll_check;
alter table public.opsboss_records add constraint opsboss_records_coll_check check (coll = any (array[
  'settings','customers','leads','estimates','jobs','invoices','plans','permits','pricebook','techs','activity','workflows','tasks','pos','bills',
  'ledger','exceptions','runs','alerts','appts','tickets','warranties','comp']));

-- ---------- Helpers ----------
create or replace function opsboss_private.my_email() returns text
language sql stable set search_path = public as $$ select lower(coalesce(auth.jwt()->>'email', '')) $$;

create or replace function opsboss_private.my_tech_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.opsboss_records where coll = 'techs' and opsboss_private.my_email() <> '' and lower(data->>'email') = opsboss_private.my_email() limit 1
$$;

create or replace function opsboss_private.sub_jobs() returns setof text
language sql stable security definer set search_path = public as $$
  select id from public.opsboss_records where coll = 'jobs' and data->'techIds' ? opsboss_private.my_tech_id()
$$;

create or replace function opsboss_private.can_read(p_coll text, p_id text, p_data jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r text := opsboss_private.opsboss_role(); t text;
begin
  if r is null then return false; end if;
  if p_coll in ('comp', 'ledger') or (p_coll = 'settings' and p_id = 'private') then return r in ('owner', 'admin', 'finance'); end if;
  if p_coll in ('pos', 'bills', 'exceptions') then return r in ('owner', 'admin', 'finance', 'ops', 'purchasing'); end if;
  if p_coll = 'runs' then return r in ('owner', 'admin', 'finance', 'ops', 'purchasing') or lower(coalesce(p_data->>'by', '')) = opsboss_private.my_email(); end if;
  if r <> 'sub' then return true; end if;
  if p_coll in ('settings', 'techs') then return true; end if;
  t := opsboss_private.my_tech_id();
  if t is null then return false; end if;
  return case p_coll
    when 'jobs' then coalesce(p_data->'techIds' ? t, false)
    when 'customers' then exists (select 1 from public.opsboss_records j where j.coll = 'jobs' and j.data->>'customerId' = p_id and j.data->'techIds' ? t)
    when 'tasks' then coalesce(p_data->>'assignee' = t, false) or (p_data->'link'->>'kind' = 'job' and p_data->'link'->>'id' in (select opsboss_private.sub_jobs()))
    when 'permits' then p_data->>'jobId' in (select opsboss_private.sub_jobs())
    when 'warranties' then p_data->>'jobId' in (select opsboss_private.sub_jobs())
    when 'tickets' then coalesce(p_data->>'assignee' = t, false)
    else false end;
end;
$$;

create or replace function opsboss_private.can_write(p_coll text, p_id text, p_data jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r text := opsboss_private.opsboss_role(); t text;
begin
  if r is null then return false; end if;
  if p_coll in ('comp', 'ledger') or (p_coll = 'settings' and p_id = 'private') then return r in ('owner', 'admin', 'finance'); end if;
  if p_coll in ('pos', 'bills', 'exceptions') then return r in ('owner', 'admin', 'finance', 'ops', 'purchasing'); end if;
  if r <> 'sub' then return true; end if;
  if p_coll in ('activity', 'runs', 'alerts', 'settings') then return true; end if;
  t := opsboss_private.my_tech_id();
  if t is null then return false; end if;
  return case p_coll
    when 'jobs' then coalesce(p_data->'techIds' ? t, false)
    when 'customers' then exists (select 1 from public.opsboss_records j where j.coll = 'jobs' and j.data->>'customerId' = p_id and j.data->'techIds' ? t)
    when 'tasks' then coalesce(p_data->>'assignee' = t, false) or (p_data->'link'->>'kind' = 'job' and p_data->'link'->>'id' in (select opsboss_private.sub_jobs()))
    when 'warranties' then p_data->>'jobId' in (select opsboss_private.sub_jobs())
    when 'tickets' then coalesce(p_data->>'assignee' = t, false)
    else false end;
end;
$$;

-- ---------- Proyectos: tarifas y comisiones aparte, totales en el proyecto, aprobaciones protegidas ----------
create or replace function opsboss_private.guard_job(o jsonb, n jsonb, p_id text, r text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  approver boolean := r is null or r in ('owner', 'admin', 'finance');
  v_comp jsonb; v_priv jsonb; v_main jsonb; v_lab jsonb := '[]'::jsonb; e jsonb; rmap jsonb; v_cost numeric := 0; v_rate numeric;
  v_comms jsonb; v_cos jsonb := '[]'::jsonb; c jsonb; oc jsonb; v_new_comp jsonb;
begin
  if n->'fin' is null or jsonb_typeof(n->'fin') <> 'object' then return n; end if;
  select data into v_comp from public.opsboss_records where coll = 'comp' and id = p_id;
  select data into v_priv from public.opsboss_records where coll = 'settings' and id = 'private';
  select data into v_main from public.opsboss_records where coll = 'settings' and id = 'main';
  rmap := coalesce(v_comp->'labor', '{}'::jsonb);
  for e in select x from jsonb_array_elements(coalesce(n->'fin'->'labor', '[]'::jsonb)) x loop
    if approver and nullif(e->>'rate', '') is not null and not (rmap ? (e->>'id')) then
      rmap := rmap || jsonb_build_object(e->>'id', (e->>'rate')::numeric);
    end if;
    if not (rmap ? (e->>'id')) then
      v_rate := coalesce(nullif(v_priv->'techRates'->>(e->>'techId'), '')::numeric, nullif(v_main->>'laborRate', '')::numeric, 45);
      rmap := rmap || jsonb_build_object(e->>'id', v_rate);
    end if;
    v_cost := v_cost + coalesce(nullif(e->>'hours', '')::numeric, 0) * coalesce((rmap->>(e->>'id'))::numeric, 0);
    v_lab := v_lab || jsonb_build_array(e - 'rate');
  end loop;
  v_comms := coalesce(v_comp->'commissions', '[]'::jsonb);
  if approver and jsonb_typeof(n->'fin'->'commissions') = 'array' and jsonb_array_length(n->'fin'->'commissions') > 0 and jsonb_array_length(v_comms) = 0 then
    v_comms := n->'fin'->'commissions';
  end if;
  n := jsonb_set(n, '{fin,labor}', v_lab);
  n := n #- '{fin,commissions}';
  n := jsonb_set(n, '{fin,laborCost}', to_jsonb(round(v_cost, 2)));
  n := jsonb_set(n, '{fin,commPaid}', to_jsonb((select coalesce(round(sum(nullif(x->>'amount', '')::numeric), 2), 0) from jsonb_array_elements(v_comms) x where x->>'status' = 'paid')));
  n := jsonb_set(n, '{fin,commOpen}', to_jsonb((select coalesce(round(sum(nullif(x->>'amount', '')::numeric), 2), 0) from jsonb_array_elements(v_comms) x where x->>'status' = 'approved')));
  if not approver and o is not null and o->'fin' is not null then
    if coalesce(o->'fin'->'budget', 'null'::jsonb) <> 'null'::jsonb and (n->'fin'->'budget') is distinct from (o->'fin'->'budget') then
      n := jsonb_set(n, '{fin,budget}', o->'fin'->'budget');
    end if;
    for c in select x from jsonb_array_elements(coalesce(n->'fin'->'changeOrders', '[]'::jsonb)) x loop
      oc := (select x from jsonb_array_elements(coalesce(o->'fin'->'changeOrders', '[]'::jsonb)) x where x->>'id' = c->>'id' limit 1);
      if oc is null then
        if coalesce(c->>'status', 'pending') <> 'pending' then c := c || jsonb_build_object('status', 'pending', 'approvedBy', ''); end if;
      elsif (c->>'status') is distinct from (oc->>'status') or (oc->>'status' = 'approved' and ((c->>'price') is distinct from (oc->>'price') or (c->>'cost') is distinct from (oc->>'cost'))) then
        c := c || jsonb_build_object('status', oc->'status', 'approvedBy', coalesce(oc->'approvedBy', '""'::jsonb), 'approvedAt', coalesce(oc->'approvedAt', 'null'::jsonb), 'price', oc->'price', 'cost', oc->'cost');
      end if;
      v_cos := v_cos || jsonb_build_array(c);
    end loop;
    for oc in select x from jsonb_array_elements(coalesce(o->'fin'->'changeOrders', '[]'::jsonb)) x loop
      if oc->>'status' = 'approved' and not exists (select 1 from jsonb_array_elements(v_cos) y where y->>'id' = oc->>'id') then v_cos := v_cos || jsonb_build_array(oc); end if;
    end loop;
    n := jsonb_set(n, '{fin,changeOrders}', v_cos);
  end if;
  v_new_comp := jsonb_build_object('id', p_id, 'labor', rmap, 'commissions', v_comms);
  if v_comp is distinct from v_new_comp then
    insert into public.opsboss_records (coll, id, data) values ('comp', p_id, v_new_comp)
      on conflict (coll, id) do update set data = excluded.data;
  end if;
  return n;
end;
$$;

create or replace function opsboss_private.guard_records() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := opsboss_private.opsboss_role(); m jsonb; k text;
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.coll = 'jobs' then
    new.data := opsboss_private.guard_job(case when tg_op = 'UPDATE' then old.data end, new.data, new.id, r);
  end if;
  if r is null then return new; end if; -- service role / webhooks / SQL
  if new.coll = 'settings' and new.id = 'main' and tg_op = 'UPDATE' and r not in ('owner', 'admin', 'finance') then
    m := old.data;
    foreach k in array array['counters', 'ledgerUpdatedAt', 'ledgerSource'] loop
      if new.data ? k then m := m || jsonb_build_object(k, new.data->k); end if;
    end loop;
    if m = old.data then return null; end if;
    new.data := m;
  end if;
  if new.coll = 'pos' and r not in ('owner', 'admin', 'finance') then
    if new.data->>'status' = 'approved' and (tg_op = 'INSERT' or old.data->>'status' is distinct from 'approved') then
      new.data := new.data || jsonb_build_object('status', 'pending', 'approvedBy', '');
    elsif tg_op = 'UPDATE' and old.data->>'status' = 'approved' and new.data->>'status' = 'approved' and (old.data->>'amount') is distinct from (new.data->>'amount') then
      new.data := new.data || jsonb_build_object('status', 'pending', 'approvedBy', '');
    end if;
  end if;
  if new.coll = 'customers' and r = 'sub' and tg_op = 'UPDATE' then
    m := old.data || jsonb_build_object('equipment', coalesce(new.data->'equipment', old.data->'equipment', '[]'::jsonb));
    if m = old.data then return null; end if;
    new.data := m;
  end if;
  return new;
end;
$$;

-- Al cambiar tarifas o comisiones (comp), recalcula los totales del proyecto.
create or replace function opsboss_private.comp_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  update public.opsboss_records set data = data where coll = 'jobs' and id = new.id;
  return null;
end;
$$;

-- ---------- Auditoría ----------
create table if not exists public.opsboss_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  email text,
  role text,
  coll text not null,
  record_id text not null,
  label text,
  field text not null,
  old_value text,
  new_value text
);
create index if not exists opsboss_audit_rec_idx on public.opsboss_audit (coll, record_id, at desc);
create index if not exists opsboss_audit_at_idx on public.opsboss_audit (at desc);
alter table public.opsboss_audit enable row level security;
drop policy if exists "opsboss_audit_select" on public.opsboss_audit;
create policy "opsboss_audit_select" on public.opsboss_audit for select to authenticated
  using ((select opsboss_private.opsboss_role()) in ('owner', 'admin', 'finance'));

create or replace function opsboss_private.audit_fields(p_coll text, p_id text, d jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select case p_coll
    when 'jobs' then jsonb_build_object(
      'status', d->>'status', 'stage', d->'ops'->>'stage', 'closed', d->'ops'->>'closed', 'original budget', d->'fin'->'budget'->>'price',
      'remaining cost estimate', d->'fin'->>'remaining', 'labor cost', d->'fin'->>'laborCost', 'commissions paid', d->'fin'->>'commPaid', 'commissions approved', d->'fin'->>'commOpen',
      'direct costs', (select round(sum(nullif(x->>'amount', '')::numeric), 2)::text from jsonb_array_elements(coalesce(d->'fin'->'costs', '[]'::jsonb)) x),
      'change orders', (select string_agg(coalesce(x->>'number', '?') || ' ' || coalesce(x->>'status', '') || ' $' || coalesce(x->>'price', '0'), ', ' order by x->>'number') from jsonb_array_elements(coalesce(d->'fin'->'changeOrders', '[]'::jsonb)) x),
      'hours logged', (select sum(nullif(x->>'hours', '')::numeric)::text from jsonb_array_elements(coalesce(d->'fin'->'labor', '[]'::jsonb)) x))
    when 'invoices' then jsonb_build_object(
      'status', d->>'status', 'disputed', d->>'disputed', 'due', d->>'due',
      'amount', (select round(sum(coalesce(nullif(x->>'qty', '')::numeric, 0) * coalesce(nullif(x->>'price', '')::numeric, 0)), 2)::text from jsonb_array_elements(coalesce(d->'items', '[]'::jsonb)) x),
      'payments', (select round(sum(nullif(x->>'amount', '')::numeric), 2)::text from jsonb_array_elements(coalesce(d->'payments', '[]'::jsonb)) x))
    when 'pos' then jsonb_build_object('status', d->>'status', 'amount', d->>'amount', 'approved by', d->>'approvedBy', 'received', d->>'receivedAt')
    when 'bills' then jsonb_build_object('paid', d->>'paidAt',
      'amount', (select round(sum(nullif(x->>'amount', '')::numeric), 2)::text from jsonb_array_elements(coalesce(d->'lines', '[]'::jsonb)) x))
    when 'estimates' then jsonb_build_object('status', d->>'status', 'option', d->>'selected', 'deposit %', d->>'deposit', 'signed by', d->>'signedBy')
    when 'comp' then jsonb_build_object(
      'commissions', (select string_agg(coalesce(x->>'rep', '?') || ' $' || coalesce(x->>'amount', '0') || ' ' || coalesce(x->>'status', ''), ', ') from jsonb_array_elements(coalesce(d->'commissions', '[]'::jsonb)) x),
      'labor rates', (select string_agg(key || '=' || value, ', ' order by key) from jsonb_each_text(coalesce(d->'labor', '{}'::jsonb))))
    when 'tickets' then jsonb_build_object('status', d->>'status', 'warranty', d->>'warranty', 'assignee', d->>'assignee')
    when 'settings' then case when p_id = 'private'
      then jsonb_build_object('commission rules', (d->'commRules')::text, 'tech rates', (d->'techRates')::text)
      else jsonb_build_object('tax rate', d->>'taxRate', 'online payments', d->>'paymentsEnabled', 'automatic messages live', d->>'outboundLive', 'overhead rule', (d->'overhead')::text, 'labor rate', d->>'laborRate') end
    else null end
$$;

create or replace function opsboss_private.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text := coalesce(new.coll, old.coll); rid text := coalesce(new.id, old.id); o jsonb; n jsonb; k text; lbl text;
  v_email text := nullif(opsboss_private.my_email(), ''); v_role text := opsboss_private.opsboss_role();
begin
  if c not in ('jobs', 'invoices', 'pos', 'bills', 'estimates', 'comp', 'settings', 'tickets') then return null; end if;
  lbl := coalesce(new.data->>'number', old.data->>'number', new.data->>'vendor', old.data->>'vendor', rid);
  if tg_op = 'INSERT' then
    insert into public.opsboss_audit (user_id, email, role, coll, record_id, label, field) values (auth.uid(), v_email, v_role, c, rid, lbl, 'created');
    return null;
  end if;
  if tg_op = 'DELETE' then
    insert into public.opsboss_audit (user_id, email, role, coll, record_id, label, field) values (auth.uid(), v_email, v_role, c, rid, lbl, 'deleted');
    return null;
  end if;
  o := opsboss_private.audit_fields(c, rid, old.data); n := opsboss_private.audit_fields(c, rid, new.data);
  if n is null then return null; end if;
  for k in select jsonb_object_keys(n) loop
    if (o->>k) is distinct from (n->>k) then
      insert into public.opsboss_audit (user_id, email, role, coll, record_id, label, field, old_value, new_value)
        values (auth.uid(), v_email, v_role, c, rid, lbl, k, left(o->>k, 2000), left(n->>k, 2000));
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists opsboss_guard on public.opsboss_records;
create trigger opsboss_guard before insert or update on public.opsboss_records for each row execute function opsboss_private.guard_records();
drop trigger if exists opsboss_comp_touch on public.opsboss_records;
create trigger opsboss_comp_touch after insert or update on public.opsboss_records for each row when (new.coll = 'comp') execute function opsboss_private.comp_touch();
drop trigger if exists opsboss_audit on public.opsboss_records;
create trigger opsboss_audit after insert or update or delete on public.opsboss_records for each row execute function opsboss_private.audit();

-- ---------- Políticas ----------
drop policy if exists "opsboss_records_rw" on public.opsboss_records;
drop policy if exists "opsboss_records_select" on public.opsboss_records;
drop policy if exists "opsboss_records_insert" on public.opsboss_records;
drop policy if exists "opsboss_records_update" on public.opsboss_records;
drop policy if exists "opsboss_records_delete" on public.opsboss_records;
create policy "opsboss_records_select" on public.opsboss_records for select to authenticated using (opsboss_private.can_read(coll, id, data));
create policy "opsboss_records_insert" on public.opsboss_records for insert to authenticated with check (opsboss_private.can_write(coll, id, data));
create policy "opsboss_records_update" on public.opsboss_records for update to authenticated using (opsboss_private.can_read(coll, id, data)) with check (opsboss_private.can_write(coll, id, data));
create policy "opsboss_records_delete" on public.opsboss_records for delete to authenticated using (opsboss_private.can_write(coll, id, data));

-- Fotos: el subcontratista solo ve y sube fotos de sus trabajos (jobs/<id>/...)
drop policy if exists "opsboss_photos_select" on storage.objects;
drop policy if exists "opsboss_photos_insert" on storage.objects;
drop policy if exists "opsboss_photos_update" on storage.objects;
drop policy if exists "opsboss_photos_delete" on storage.objects;
create policy "opsboss_photos_select" on storage.objects for select to authenticated using (bucket_id = 'opsboss-photos' and (select opsboss_private.opsboss_is_member())
  and ((select opsboss_private.opsboss_role()) <> 'sub' or (storage.foldername(name))[2] in (select opsboss_private.sub_jobs())));
create policy "opsboss_photos_insert" on storage.objects for insert to authenticated with check (bucket_id = 'opsboss-photos' and (select opsboss_private.opsboss_is_member())
  and ((select opsboss_private.opsboss_role()) <> 'sub' or (storage.foldername(name))[2] in (select opsboss_private.sub_jobs())));
create policy "opsboss_photos_update" on storage.objects for update to authenticated using (bucket_id = 'opsboss-photos' and (select opsboss_private.opsboss_is_member())
  and ((select opsboss_private.opsboss_role()) <> 'sub' or (storage.foldername(name))[2] in (select opsboss_private.sub_jobs())))
  with check (bucket_id = 'opsboss-photos' and (select opsboss_private.opsboss_is_member()));
create policy "opsboss_photos_delete" on storage.objects for delete to authenticated using (bucket_id = 'opsboss-photos' and (select opsboss_private.opsboss_role()) in ('owner', 'admin', 'ops', 'office'));

-- Links del portal: no para subcontratistas
create or replace function public.opsboss_portal_link(p_kind text, p_id text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not opsboss_private.opsboss_is_member() or opsboss_private.opsboss_role() = 'sub' then raise exception 'not allowed'; end if;
  if p_kind not in ('estimate', 'invoice', 'project') then raise exception 'bad kind'; end if;
  if not exists (select 1 from public.opsboss_records where coll = case p_kind when 'estimate' then 'estimates' when 'invoice' then 'invoices' else 'jobs' end and id = p_id) then
    raise exception 'record not found';
  end if;
  return opsboss_private.link_for(p_kind, p_id);
end;
$$;

revoke all on function opsboss_private.my_email() from public, anon;
revoke all on function opsboss_private.my_tech_id() from public, anon;
revoke all on function opsboss_private.sub_jobs() from public, anon;
revoke all on function opsboss_private.can_read(text, text, jsonb) from public, anon;
revoke all on function opsboss_private.can_write(text, text, jsonb) from public, anon;
revoke all on function opsboss_private.guard_job(jsonb, jsonb, text, text) from public, anon, authenticated;
revoke all on function opsboss_private.guard_records() from public, anon, authenticated;
revoke all on function opsboss_private.comp_touch() from public, anon, authenticated;
revoke all on function opsboss_private.audit() from public, anon, authenticated;
revoke all on function opsboss_private.audit_fields(text, text, jsonb) from public, anon, authenticated;
grant usage on schema opsboss_private to authenticated;
grant execute on function opsboss_private.my_email(), opsboss_private.my_tech_id(), opsboss_private.sub_jobs(),
  opsboss_private.can_read(text, text, jsonb), opsboss_private.can_write(text, text, jsonb) to authenticated;
