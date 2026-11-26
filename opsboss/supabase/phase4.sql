-- ============================================================
-- OpsBoss — Fase 4: portal del proyecto, solicitudes de servicio, tickets y garantías
-- Run AFTER schema.sql and portal.sql. Already applied to the "opsboss" project.
-- ============================================================

alter table public.opsboss_records drop constraint if exists opsboss_records_coll_check;
alter table public.opsboss_records add constraint opsboss_records_coll_check check (coll = any (array[
  'settings','customers','leads','estimates','jobs','invoices','plans','permits','pricebook','techs','activity','workflows','tasks','pos','bills',
  'ledger','exceptions','runs','alerts','appts','tickets','warranties']));

alter table public.opsboss_portal_links drop constraint if exists opsboss_portal_links_kind_check;
alter table public.opsboss_portal_links add constraint opsboss_portal_links_kind_check check (kind in ('estimate', 'invoice', 'project'));

-- Equipo: crear/obtener link del portal (ahora también para proyectos)
create or replace function public.opsboss_portal_link(p_kind text, p_id text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not opsboss_private.opsboss_is_member() then raise exception 'not allowed'; end if;
  if p_kind not in ('estimate', 'invoice', 'project') then raise exception 'bad kind'; end if;
  if not exists (select 1 from public.opsboss_records where coll = case p_kind when 'estimate' then 'estimates' when 'invoice' then 'invoices' else 'jobs' end and id = p_id) then
    raise exception 'record not found';
  end if;
  return opsboss_private.link_for(p_kind, p_id);
end;
$$;

-- Cliente (anónimo, con token): vista del proyecto sin costos, márgenes ni notas internas.
create or replace function public.opsboss_portal_project(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l record; j jsonb; s jsonb; c jsonb; v_tax numeric; v_est jsonb := null;
begin
  select * into l from public.opsboss_portal_links where token = p_token;
  if l.token is null or l.revoked or l.expires_at < now() or l.kind <> 'project' then return jsonb_build_object('error', 'invalid'); end if;
  select data into j from public.opsboss_records where coll = 'jobs' and id = l.record_id;
  if j is null then return jsonb_build_object('error', 'missing'); end if;
  select data into s from public.opsboss_records where coll = 'settings' and id = 'main';
  select data into c from public.opsboss_records where coll = 'customers' and id = j->>'customerId';
  v_tax := coalesce(nullif(s->>'taxRate', '')::numeric, 0);
  update public.opsboss_portal_links set view_count = view_count + 1, last_viewed_at = now(), first_viewed_at = coalesce(first_viewed_at, now()) where token = p_token;
  if nullif(j->>'estimateId', '') is not null then
    select jsonb_build_object('number', data->'number', 'status', data->'status', 'title', data->'title', 'token', opsboss_private.link_for('estimate', id))
      into v_est from public.opsboss_records where coll = 'estimates' and id = j->>'estimateId';
  end if;
  return jsonb_build_object(
    'company', jsonb_build_object('name', s->>'company', 'phone', s->>'phone', 'email', s->>'email', 'address', s->>'address', 'license', s->>'license'),
    'customer', jsonb_build_object('name', c->>'name', 'address', c->>'address', 'city', c->>'city', 'zip', c->>'zip'),
    'project', jsonb_build_object('number', j->'number', 'title', j->'title', 'division', j->'division', 'status', j->'status', 'start', j->'start',
      'expectedInstall', j->'expectedInstall', 'stage', j->'ops'->'stage', 'closed', j->'ops'->'closed', 'completedAt', j->'completedAt', 'portalNote', j->'portalNote',
      'equipment', (select coalesce(jsonb_agg(jsonb_build_object('type', e->'type', 'brand', e->'brand', 'model', e->'model', 'serial', e->'serial')), '[]'::jsonb) from jsonb_array_elements(coalesce(j->'installedEquip', '[]'::jsonb)) e),
      'signoff', case when j->'signoff' is not null then jsonb_build_object('name', j->'signoff'->'name', 'at', j->'signoff'->'at') else null end),
    'estimate', v_est,
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object('number', data->'number', 'kind', data->'kind', 'status', data->'status', 'due', data->'due', 'createdAt', data->'createdAt',
        'total', round(opsboss_private.items_total(data->'items', v_tax), 2),
        'paid', (select coalesce(sum(nullif(p->>'amount', '')::numeric), 0) from jsonb_array_elements(coalesce(data->'payments', '[]'::jsonb)) p),
        'token', opsboss_private.link_for('invoice', id)) order by data->>'createdAt'), '[]'::jsonb)
      from public.opsboss_records where coll = 'invoices' and data->>'status' not in ('draft', 'void')
        and (data->>'jobId' = l.record_id or (nullif(j->>'estimateId', '') is not null and data->>'estimateId' = j->>'estimateId'))),
    'permits', (select coalesce(jsonb_agg(jsonb_build_object('type', data->'type', 'status', data->'status', 'number', data->'number')), '[]'::jsonb)
      from public.opsboss_records where coll = 'permits' and data->>'jobId' = l.record_id),
    'visits', (select coalesce(jsonb_agg(jsonb_build_object('title', data->'title', 'start', data->'start', 'duration', data->'duration', 'status', data->'status') order by data->>'start'), '[]'::jsonb)
      from public.opsboss_records where coll = 'jobs' and data->>'customerId' = j->>'customerId' and nullif(data->>'start', '') is not null
        and (data->>'start')::timestamptz > now() - interval '1 day' and data->>'status' not in ('cancelled', 'completed')),
    'appointments', (select coalesce(jsonb_agg(jsonb_build_object('title', data->'title', 'start', data->'start', 'status', data->'status') order by data->>'start'), '[]'::jsonb)
      from public.opsboss_records where coll = 'appts' and data->>'customerId' = j->>'customerId' and data->>'status' = 'booked'
        and nullif(data->>'start', '') is not null and (data->>'start')::timestamptz > now() - interval '1 day'),
    'warranties', (select coalesce(jsonb_agg(jsonb_build_object('type', data->'type', 'item', data->'item', 'provider', data->'provider', 'start', data->'start', 'end', data->'end', 'registered', data->'registered')), '[]'::jsonb)
      from public.opsboss_records where coll = 'warranties' and data->>'jobId' = l.record_id),
    'tickets', (select coalesce(jsonb_agg(jsonb_build_object('number', data->'number', 'title', data->'title', 'status', data->'status', 'createdAt', data->'createdAt') order by data->>'createdAt' desc), '[]'::jsonb)
      from public.opsboss_records where coll = 'tickets' and data->>'customerId' = j->>'customerId'));
end;
$$;

-- Cliente: solicitud de servicio → crea un ticket ligado al proyecto (máx. 5 por día por link).
create or replace function public.opsboss_portal_service_request(p_token text, p_title text, p_text text, p_contact text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l record; j jsonb; c jsonb; v_n integer; v_id text; v_aid text; v_now text := opsboss_private.now_iso(); m jsonb := opsboss_private.req_meta();
begin
  select * into l from public.opsboss_portal_links where token = p_token;
  if l.token is null or l.revoked or l.expires_at < now() or l.kind <> 'project' then return jsonb_build_object('error', 'invalid'); end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(p_title) > 120 then return jsonb_build_object('error', 'title'); end if;
  if length(coalesce(p_text, '')) > 2000 or length(coalesce(p_contact, '')) > 200 then return jsonb_build_object('error', 'too_long'); end if;
  if (select count(*) from public.opsboss_portal_events where token = p_token and event = 'service_request' and created_at > now() - interval '1 day') >= 5 then
    return jsonb_build_object('error', 'limit');
  end if;
  select data into j from public.opsboss_records where coll = 'jobs' and id = l.record_id;
  if j is null then return jsonb_build_object('error', 'missing'); end if;
  select data into c from public.opsboss_records where coll = 'customers' and id = j->>'customerId';
  perform pg_advisory_xact_lock(hashtext('opsboss-ticket-number'));
  select coalesce(max(nullif(regexp_replace(data->>'number', '\D', '', 'g'), '')::integer), 1000) + 1 into v_n from public.opsboss_records where coll = 'tickets';
  v_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.opsboss_records (coll, id, data) values ('tickets', v_id, jsonb_build_object(
    'id', v_id, 'number', 'T-' || v_n, 'customerId', j->'customerId', 'jobId', l.record_id, 'division', j->'division',
    'title', trim(p_title), 'description', coalesce(p_text, ''), 'contact', coalesce(p_contact, ''), 'source', 'portal', 'priority', 'normal',
    'status', 'new', 'assignee', '', 'createdAt', v_now, 'time', '[]'::jsonb, 'parts', '[]'::jsonb,
    'history', jsonb_build_array(jsonb_build_object('ts', v_now, 'by', 'Customer portal', 'text', 'Request submitted by the customer'))));
  v_aid := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.opsboss_records (coll, id, data) values ('alerts', v_aid, jsonb_build_object(
    'id', v_aid, 'kind', 'ticket.new', 'sev', 'warn', 'ts', v_now, 'title', 'Service request T-' || v_n || ': ' || trim(p_title),
    'text', coalesce(c->>'name', '') || ' · ' || coalesce(j->>'number', ''), 'link', jsonb_build_object('kind', 'ticket', 'id', v_id), 'readBy', '[]'::jsonb));
  insert into public.opsboss_portal_events (token, kind, record_id, event, reason, ip, user_agent)
    values (p_token, 'project', l.record_id, 'service_request', left(trim(p_title) || ' — ' || coalesce(p_text, ''), 1000), m->>'ip', m->>'ua');
  return jsonb_build_object('ok', true, 'number', 'T-' || v_n);
end;
$$;

revoke all on function public.opsboss_portal_link(text, text) from public, anon;
grant execute on function public.opsboss_portal_link(text, text) to authenticated;
revoke all on function public.opsboss_portal_project(text) from public;
grant execute on function public.opsboss_portal_project(text) to anon, authenticated;
revoke all on function public.opsboss_portal_service_request(text, text, text, text) from public;
grant execute on function public.opsboss_portal_service_request(text, text, text, text) to anon, authenticated;
