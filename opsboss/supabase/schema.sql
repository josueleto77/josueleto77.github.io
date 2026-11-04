-- ============================================================
-- OpsBoss — esquema de Supabase
-- Proyecto dedicado: "opsboss" (organización Nexis, ref nkmgpsbqmqwlsaxtbgaq).
-- Ya está instalado. Este archivo sirve para reinstalar o crear otro
-- entorno: Supabase → SQL Editor → pegar todo → Run. Se puede ejecutar
-- más de una vez sin problema.
--
-- Acceso: solo quien esté en opsboss_members. Se entra por invitación
-- (opsboss_invites); al iniciar sesión, opsboss_claim() convierte la
-- invitación en membresía.
-- ============================================================

-- ---------- Tablas ----------
create table if not exists public.opsboss_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'office' check (role in ('owner', 'admin', 'office', 'tech')),
  created_at timestamptz not null default now()
);

create table if not exists public.opsboss_invites (
  email text primary key,
  role text not null default 'office' check (role in ('owner', 'admin', 'office', 'tech')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Un registro = un cliente, trabajo, estimado, factura, etc. (JSON).
create table if not exists public.opsboss_records (
  coll text not null check (coll in ('settings', 'customers', 'leads', 'estimates', 'jobs', 'invoices', 'plans', 'permits', 'pricebook', 'techs', 'activity')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  primary key (coll, id)
);
create index if not exists opsboss_records_updated_idx on public.opsboss_records (updated_at desc);
create index if not exists opsboss_records_updated_by_idx on public.opsboss_records (updated_by);
create index if not exists opsboss_invites_invited_by_idx on public.opsboss_invites (invited_by);

alter table public.opsboss_members enable row level security;
alter table public.opsboss_invites enable row level security;
alter table public.opsboss_records enable row level security;

-- ---------- Funciones auxiliares (esquema privado, no expuesto por la API) ----------
create schema if not exists opsboss_private;
revoke all on schema opsboss_private from public, anon;
grant usage on schema opsboss_private to authenticated;

create or replace function opsboss_private.opsboss_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.opsboss_members where user_id = auth.uid();
$$;

create or replace function opsboss_private.opsboss_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.opsboss_members where user_id = auth.uid());
$$;

create or replace function opsboss_private.opsboss_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'admin') from public.opsboss_members where user_id = auth.uid()), false);
$$;

-- Al iniciar sesión: devuelve el rol; si hay invitación pendiente (y el
-- email está confirmado), crea la membresía. Pública a propósito (la app la llama).
create or replace function public.opsboss_claim() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_user record;
  v_inv record;
begin
  if auth.uid() is null then return null; end if;
  select role into v_role from public.opsboss_members where user_id = auth.uid();
  if v_role is not null then return v_role; end if;

  select id, email, email_confirmed_at, raw_user_meta_data into v_user from auth.users where id = auth.uid();
  if v_user.email is null or v_user.email_confirmed_at is null then return null; end if;

  select * into v_inv from public.opsboss_invites where lower(email) = lower(v_user.email);
  if v_inv.email is null then return null; end if;

  insert into public.opsboss_members (user_id, email, name, role)
  values (v_user.id, v_user.email, coalesce(v_user.raw_user_meta_data->>'name', split_part(v_user.email, '@', 1)), v_inv.role)
  on conflict (user_id) do nothing;
  delete from public.opsboss_invites where email = v_inv.email;
  return v_inv.role;
end;
$$;

revoke all on function public.opsboss_claim() from public, anon;
grant execute on function public.opsboss_claim() to authenticated;
revoke all on function opsboss_private.opsboss_role() from public, anon;
grant execute on function opsboss_private.opsboss_role() to authenticated;
revoke all on function opsboss_private.opsboss_is_member() from public, anon;
grant execute on function opsboss_private.opsboss_is_member() to authenticated;
revoke all on function opsboss_private.opsboss_is_admin() from public, anon;
grant execute on function opsboss_private.opsboss_is_admin() to authenticated;

-- Marca de tiempo y autor en cada cambio
create or replace function public.opsboss_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists opsboss_records_touch on public.opsboss_records;
create trigger opsboss_records_touch before insert or update on public.opsboss_records
  for each row execute function public.opsboss_touch();

-- ---------- Políticas (RLS) ----------
-- Registros: cualquier miembro lee y escribe.
drop policy if exists "opsboss_records_rw" on public.opsboss_records;
create policy "opsboss_records_rw" on public.opsboss_records for all to authenticated
  using ((select opsboss_private.opsboss_is_member()))
  with check ((select opsboss_private.opsboss_is_member()));

-- Miembros: el equipo ve la lista; owner/admin cambian roles o quitan;
-- solo un owner gestiona a otro owner; nadie se quita a sí mismo.
drop policy if exists "opsboss_members_select" on public.opsboss_members;
create policy "opsboss_members_select" on public.opsboss_members for select to authenticated
  using ((select opsboss_private.opsboss_is_member()));
drop policy if exists "opsboss_members_update" on public.opsboss_members;
create policy "opsboss_members_update" on public.opsboss_members for update to authenticated
  using ((select opsboss_private.opsboss_is_admin()) and (role <> 'owner' or (select opsboss_private.opsboss_role()) = 'owner'))
  with check ((select opsboss_private.opsboss_is_admin()) and (role <> 'owner' or (select opsboss_private.opsboss_role()) = 'owner'));
drop policy if exists "opsboss_members_delete" on public.opsboss_members;
create policy "opsboss_members_delete" on public.opsboss_members for delete to authenticated
  using ((select opsboss_private.opsboss_is_admin()) and (role <> 'owner' or (select opsboss_private.opsboss_role()) = 'owner') and user_id <> (select auth.uid()));

-- Invitaciones: solo owner/admin.
drop policy if exists "opsboss_invites_admin" on public.opsboss_invites;
create policy "opsboss_invites_admin" on public.opsboss_invites for all to authenticated
  using ((select opsboss_private.opsboss_is_admin()))
  with check ((select opsboss_private.opsboss_is_admin()) and (role <> 'owner' or (select opsboss_private.opsboss_role()) = 'owner'));

-- ---------- Tiempo real ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'opsboss_records') then
    alter publication supabase_realtime add table public.opsboss_records;
  end if;
end $$;

-- ---------- Primer dueño (cambia el email si reinstalas) ----------
-- insert into public.opsboss_invites (email, role) values ('TU_EMAIL@empresa.com', 'owner')
--   on conflict (email) do update set role = 'owner';
