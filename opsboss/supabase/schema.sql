-- ============================================================
-- OpsBoss — esquema de Supabase
-- Se instala en el MISMO proyecto que Nexis Academy, sin tocar sus
-- tablas: todo lleva el prefijo opsboss_ y su propio control de acceso.
-- Comparte los usuarios de auth: una cuenta de la Academy puede entrar
-- a OpsBoss solo si está invitada en opsboss_invites / opsboss_members.
--
-- Cómo instalar: Supabase → SQL Editor → pegar todo → Run.
-- Es seguro ejecutarlo más de una vez.
-- ============================================================

-- ---------- Miembros del equipo de OpsBoss ----------
create table if not exists public.opsboss_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'office' check (role in ('owner', 'admin', 'office', 'tech')),
  created_at timestamptz not null default now()
);

-- ---------- Invitaciones (quién puede unirse) ----------
create table if not exists public.opsboss_invites (
  email text primary key,
  role text not null default 'office' check (role in ('owner', 'admin', 'office', 'tech')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Registros del CRM ----------
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

alter table public.opsboss_members enable row level security;
alter table public.opsboss_invites enable row level security;
alter table public.opsboss_records enable row level security;

-- ---------- Funciones auxiliares ----------
create or replace function public.opsboss_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.opsboss_members where user_id = auth.uid();
$$;

create or replace function public.opsboss_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.opsboss_members where user_id = auth.uid());
$$;

create or replace function public.opsboss_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'admin') from public.opsboss_members where user_id = auth.uid()), false);
$$;

-- Al iniciar sesión: devuelve el rol del usuario; si tiene una invitación
-- pendiente (y su email está confirmado), lo convierte en miembro.
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
revoke all on function public.opsboss_role() from public, anon;
grant execute on function public.opsboss_role() to authenticated;
revoke all on function public.opsboss_is_member() from public, anon;
grant execute on function public.opsboss_is_member() to authenticated;
revoke all on function public.opsboss_is_admin() from public, anon;
grant execute on function public.opsboss_is_admin() to authenticated;

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
-- Registros: cualquier miembro del equipo lee y escribe.
drop policy if exists "opsboss_records_rw" on public.opsboss_records;
create policy "opsboss_records_rw" on public.opsboss_records for all to authenticated
  using ((select public.opsboss_is_member()))
  with check ((select public.opsboss_is_member()));

-- Miembros: el equipo ve la lista; solo owner/admin cambian roles o quitan
-- miembros, y solo un owner puede crear/quitar otro owner.
drop policy if exists "opsboss_members_select" on public.opsboss_members;
create policy "opsboss_members_select" on public.opsboss_members for select to authenticated
  using ((select public.opsboss_is_member()));
drop policy if exists "opsboss_members_update" on public.opsboss_members;
create policy "opsboss_members_update" on public.opsboss_members for update to authenticated
  using ((select public.opsboss_is_admin()) and (role <> 'owner' or (select public.opsboss_role()) = 'owner'))
  with check ((select public.opsboss_is_admin()) and (role <> 'owner' or (select public.opsboss_role()) = 'owner'));
drop policy if exists "opsboss_members_delete" on public.opsboss_members;
create policy "opsboss_members_delete" on public.opsboss_members for delete to authenticated
  using ((select public.opsboss_is_admin()) and (role <> 'owner' or (select public.opsboss_role()) = 'owner') and user_id <> (select auth.uid()));

-- Invitaciones: solo owner/admin.
drop policy if exists "opsboss_invites_admin" on public.opsboss_invites;
create policy "opsboss_invites_admin" on public.opsboss_invites for all to authenticated
  using ((select public.opsboss_is_admin()))
  with check ((select public.opsboss_is_admin()) and (role <> 'owner' or (select public.opsboss_role()) = 'owner'));

-- ---------- Tiempo real (cambios en vivo entre usuarios) ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'opsboss_records') then
    alter publication supabase_realtime add table public.opsboss_records;
  end if;
end $$;

-- ============================================================
-- PRIMER DUEÑO: cambia el email por el tuyo y ejecuta esta línea.
-- Luego entra a OpsBoss con ese email (si ya tienes cuenta en la
-- Academy, usa la misma contraseña; si no, "Crear cuenta").
-- ============================================================
-- insert into public.opsboss_invites (email, role) values ('TU_EMAIL@nexispower.com', 'owner')
--   on conflict (email) do update set role = 'owner';
