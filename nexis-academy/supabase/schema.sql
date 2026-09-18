-- ============================================================
-- NEXIS POWER ACADEMY — Supabase schema
-- Run this once in your dedicated Academy project's SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Teams (a manager owns a team; reps belong to a team) ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_id uuid, -- references profiles(id), added after profiles exists
  created_at timestamptz not null default now()
);

-- ---------- Profiles (one row per authenticated user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'rep' check (role in ('rep', 'manager', 'admin')),
  team_id uuid references public.teams(id) on delete set null,
  xp integer not null default 0,
  training_minutes integer not null default 0,
  streak_count integer not null default 0,
  last_active date,
  created_at timestamptz not null default now()
);

alter table public.teams drop constraint if exists teams_manager_fk;
alter table public.teams
  add constraint teams_manager_fk foreign key (manager_id) references public.profiles(id) on delete set null;

-- ---------- Invites (admin-only: gates who is allowed to sign up) ----------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'rep' check (role in ('rep', 'manager', 'admin')),
  team_id uuid references public.teams(id) on delete set null,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references public.profiles(id)
);

-- ---------- Training progress tables (mirror the app's state.js shape) ----------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  module_id text not null,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  est_minutes integer not null default 6,
  unique (user_id, course_id, module_id, lesson_id)
);

create table if not exists public.module_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  module_id text not null,
  score_pct integer not null,
  passed boolean not null,
  attempts integer not null default 1,
  last_at timestamptz not null default now(),
  unique (user_id, course_id, module_id)
);

create table if not exists public.lab_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  lab_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, course_id, lab_id)
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  score_pct integer not null,
  compliance_pct integer not null,
  passed boolean not null,
  total_questions integer not null,
  correct integer not null,
  category_breakdown jsonb not null default '[]',
  at timestamptz not null default now()
);

create table if not exists public.practical_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  score_pct integer not null,
  passed boolean not null,
  breakdown jsonb not null default '{}',
  next_step_text text,
  at timestamptz not null default now()
);

create table if not exists public.badges_earned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table if not exists public.xp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text,
  at timestamptz not null default now()
);

-- ---------- Admin-editable shared content ----------
create table if not exists public.mass_save_programs (
  id text primary key,
  program_name text not null,
  program_type text,
  current_incentive text,
  maximum_incentive text,
  eligibility_requirements text,
  utility_requirements text,
  weatherization_requirements text,
  effective_date date,
  expiration_date date,
  last_verified date,
  source text,
  reviewed_by text,
  status text not null default 'active' check (status in ('active', 'review_needed', 'expired')),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  status text not null default 'awaiting_review',
  proposed_course text,
  proposed_modules jsonb default '[]',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.module_checks enable row level security;
alter table public.lab_progress enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.practical_attempts enable row level security;
alter table public.badges_earned enable row level security;
alter table public.xp_log enable row level security;
alter table public.mass_save_programs enable row level security;
alter table public.content_drafts enable row level security;

-- Helper: is the current user an admin / manager, and what is their team?
create or replace function public.current_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_team() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_manager_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('manager', 'admin') from public.profiles where id = auth.uid()), false);
$$;

-- ---------- profiles ----------
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select
  using (id = auth.uid());
drop policy if exists "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped" on public.profiles for select
  using (public.is_admin() or (public.current_role() = 'manager' and team_id = public.current_team()));
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin());

-- ---------- teams ----------
drop policy if exists "teams_select_scoped" on public.teams;
create policy "teams_select_scoped" on public.teams for select
  using (public.is_manager_or_admin());
drop policy if exists "teams_write_admin" on public.teams;
create policy "teams_write_admin" on public.teams for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- invites: admin-only, this is the signup gate ----------
drop policy if exists "invites_admin_all" on public.invites;
create policy "invites_admin_all" on public.invites for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- progress tables: own rows read/write, manager/admin read-scoped ----------
do $$
declare t text;
begin
  foreach t in array array['lesson_progress','module_checks','lab_progress','exam_attempts','practical_attempts','badges_earned','xp_log'] loop
    execute format('drop policy if exists "%1$s_own_rw" on public.%1$s', t);
    execute format('create policy "%1$s_own_rw" on public.%1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s_scoped_read" on public.%1$s', t);
    execute format('create policy "%1$s_scoped_read" on public.%1$s for select using (
      public.is_admin() or (
        public.current_role() = ''manager'' and exists (
          select 1 from public.profiles p where p.id = %1$s.user_id and p.team_id = public.current_team()
        )
      )
    )', t);
  end loop;
end $$;

-- ---------- mass_save_programs: everyone signed-in can read, only admin writes ----------
drop policy if exists "msp_select_all" on public.mass_save_programs;
create policy "msp_select_all" on public.mass_save_programs for select
  using (auth.uid() is not null);
drop policy if exists "msp_write_admin" on public.mass_save_programs;
create policy "msp_write_admin" on public.mass_save_programs for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- content_drafts: admin-only ----------
drop policy if exists "drafts_admin_all" on public.content_drafts;
create policy "drafts_admin_all" on public.content_drafts for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Leaderboard
-- A company-wide leaderboard needs every rep to see everyone's name +
-- XP, but the RLS policies above deliberately keep profiles/xp_log
-- scoped to self / admin / your own manager's team — a rep should not
-- be able to read a teammate's email, role, or raw progress rows. This
-- function runs as SECURITY DEFINER (bypassing RLS) but only ever
-- returns the two non-sensitive columns a leaderboard needs.
-- 'week' sums xp_log since the start of the current week (Mon 00:00);
-- anything else returns each profile's all-time xp total.
-- ============================================================
create or replace function public.leaderboard(p_scope text default 'week')
returns table(id uuid, name text, xp integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.name,
    (case when p_scope = 'week'
      then coalesce((
        select sum(x.amount) from public.xp_log x
        where x.user_id = p.id and x.at >= date_trunc('week', now())
      ), 0)
      else p.xp
    end)::integer as xp
  from public.profiles p
  order by xp desc, p.name asc;
$$;

grant execute on function public.leaderboard(text) to authenticated;

-- ============================================================
-- Invite-gated signup trigger
-- New auth.users row → only becomes a usable profile if the email
-- matches an unused row in `invites`. Otherwise no profile is created
-- and the app blocks the person with "your email hasn't been invited."
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.invites
    where lower(email) = lower(new.email) and used_at is null
    limit 1;

  if inv.id is not null then
    insert into public.profiles (id, email, name, role, team_id)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      inv.role,
      inv.team_id
    );
    update public.invites set used_at = now(), used_by = new.id where id = inv.id;
  end if;
  -- if no invite matches, we deliberately do NOT create a profile;
  -- the app checks for a profile after login and blocks access if absent.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Bootstrap: make YOURSELF the first admin.
-- Run this manually, once, AFTER you've signed up through the app once
-- with your own email (that first signup will have no profile yet
-- because you haven't invited yourself — that's expected and fine).
-- Replace the email below with your own, then run just this block.
-- ============================================================
-- insert into public.invites (email, role) values ('you@nexispower.com', 'admin')
--   on conflict (email) do update set role = 'admin', used_at = null;
-- -- then sign up again (or re-submit the signup form) with that email.
