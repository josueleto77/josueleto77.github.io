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
-- Employment classification (W-2 vs 1099) is decided by the admin up front,
-- at invite time -- never mid-onboarding -- so a rep can complete their
-- entire self-service onboarding (personal info + every required document)
-- in one sitting instead of stalling on a "waiting on HR" step. Re-run-safe
-- widen for installs that already had the old invites shape.
alter table public.invites add column if not exists classification text not null default 'not_assigned';
alter table public.invites drop constraint if exists invites_classification_check;
alter table public.invites add constraint invites_classification_check
  check (classification in ('not_assigned', 'w2_employee', '1099_contractor'));

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
    -- The profiles insert above already fired on_profile_created_onboarding,
    -- which created onboarding_admin with classification = 'not_assigned'.
    -- Correct it here to whatever the admin chose at invite time.
    if inv.classification is not null and inv.classification <> 'not_assigned' then
      update public.onboarding_admin set classification = inv.classification, updated_at = now() where user_id = new.id;
    end if;
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
-- Sales Rep Onboarding
-- Offer Accepted -> Documents Complete -> Compliance Approved ->
-- Accounts Created -> Training Complete -> Ready to Sell.
--
-- Deliberately split in two tables so Row Level Security does the
-- enforcing, not app code: onboarding_profile holds only the
-- NON-sensitive fields the rep is trusted to fill in themselves;
-- onboarding_admin holds classification, pipeline status, and system
-- provisioning flags, which only an admin/manager may ever write (a
-- rep can read their own row so they can see their status, never
-- write it — this is the "never let the bot/rep self-assign W-2 vs
-- 1099" rule from the onboarding spec, enforced at the database).
--
-- What this deliberately does NOT store: SSNs, bank/routing numbers,
-- copies of ID documents, or any other sensitive identity/financial
-- data. onboarding_documents tracks only a document TYPE and a
-- STATUS (missing/received/verified/rejected) — never file contents
-- — consistent with routing sensitive data through a secure
-- payroll/HR system rather than through this app.
-- ============================================================

create table if not exists public.onboarding_profile (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'es')),
  legal_first_name text,
  middle_name text,
  legal_last_name text,
  preferred_name text,
  personal_email text,
  mobile_phone text,
  home_address text,
  city text,
  state text,
  zip text,
  start_date date,
  position text,
  territory text,
  track text check (track in ('solar', 'hvac', 'both')),
  emergency_contact_name text,
  emergency_contact_phone text,
  intake_submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_admin (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  classification text not null default 'not_assigned' check (classification in ('not_assigned', 'w2_employee', '1099_contractor')),
  status text not null default 'invited' check (status in (
    'invited', 'in_progress', 'waiting_on_rep', 'waiting_on_hr', 'compliance_review', 'training', 'final_review', 'ready_to_sell', 'on_hold'
  )),
  manager_id uuid references public.profiles(id) on delete set null,
  email_status text not null default 'not_created' check (email_status in ('not_created', 'pending', 'active')),
  crm_status text not null default 'not_created' check (crm_status in ('not_created', 'pending', 'active')),
  quickbooks_status text not null default 'not_created' check (quickbooks_status in ('not_created', 'pending', 'active')),
  ready_to_sell boolean not null default false,
  ready_to_sell_at timestamptz,
  ready_to_sell_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Document / policy-acknowledgment checklist. One row per (user, doc type).
-- Status only — never the document's contents. 'sent' means it was handed
-- off to the e-signature platform (DocuSeal) and is awaiting completion
-- there; docuseal_submission_id is just DocuSeal's own opaque reference id,
-- never the document itself.
create table if not exists public.onboarding_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  doc_key text not null,
  status text not null default 'missing' check (status in ('missing', 'sent', 'received', 'verified', 'rejected')),
  received_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  note text,
  docuseal_submission_id text,
  updated_at timestamptz not null default now(),
  unique (user_id, doc_key)
);
-- Re-run-safe widen for installs that already had the old status set.
alter table public.onboarding_documents add column if not exists docuseal_submission_id text;
alter table public.onboarding_documents drop constraint if exists onboarding_documents_status_check;
alter table public.onboarding_documents add constraint onboarding_documents_status_check
  check (status in ('missing', 'sent', 'received', 'verified', 'rejected'));

-- ---------- DocuSeal (e-signature) integration ----------
-- Admin-managed mapping from our internal doc_key to a DocuSeal template
-- id. Nothing about document content lives here or anywhere in this
-- database — DocuSeal hosts the template and emails the actual document
-- directly to the representative to fill out and sign.
create table if not exists public.docuseal_templates (
  doc_key text primary key,
  template_id text not null,
  label text,
  updated_at timestamptz not null default now()
);
alter table public.docuseal_templates enable row level security;
drop policy if exists "docuseal_templates_staff_all" on public.docuseal_templates;
create policy "docuseal_templates_staff_all" on public.docuseal_templates for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- HR/Admin task queue: classification review, missing docs, legal/compliance
-- escalations the bot must never guess its way through, new-hire reporting
-- reminders, etc. A rep may create a task about themselves (e.g. the
-- classification-review task created automatically while NOT_ASSIGNED);
-- only admin/manager can see or resolve the queue.
create table if not exists public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  task_type text not null check (task_type in ('classification_review', 'legal_compliance_review', 'new_hire_reporting', 'missing_documents', 'other')),
  title text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

-- Only one OPEN classification-review task per rep — lets the app
-- insert-and-ignore-conflict from client code (which cannot SELECT the
-- queue to de-duplicate itself) instead of ever showing HR the same
-- review five times. Other task types (e.g. a distinct legal/compliance
-- question per row) are intentionally not deduplicated this way.
create unique index if not exists onboarding_tasks_open_classification_unique
  on public.onboarding_tasks (user_id)
  where status = 'open' and task_type = 'classification_review';

-- Full onboarding audit trail. No unnecessary PII — action + type + status only.
create table if not exists public.onboarding_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  actor uuid references public.profiles(id),
  result text,
  at timestamptz not null default now()
);

alter table public.onboarding_profile enable row level security;
alter table public.onboarding_admin enable row level security;
alter table public.onboarding_documents enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.onboarding_audit_log enable row level security;

-- ---------- onboarding_profile: rep owns their own row; admin can correct it; manager can read scoped ----------
drop policy if exists "onb_profile_self_rw" on public.onboarding_profile;
create policy "onb_profile_self_rw" on public.onboarding_profile for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "onb_profile_admin_rw" on public.onboarding_profile;
create policy "onb_profile_admin_rw" on public.onboarding_profile for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "onb_profile_manager_read" on public.onboarding_profile;
create policy "onb_profile_manager_read" on public.onboarding_profile for select
  using (public.current_role() = 'manager' and exists (
    select 1 from public.profiles p where p.id = onboarding_profile.user_id and p.team_id = public.current_team()
  ));

-- ---------- onboarding_admin: rep may only READ their own row (see their status); only staff may write ----------
drop policy if exists "onb_admin_self_read" on public.onboarding_admin;
create policy "onb_admin_self_read" on public.onboarding_admin for select
  using (user_id = auth.uid());
drop policy if exists "onb_admin_staff_rw" on public.onboarding_admin;
create policy "onb_admin_staff_rw" on public.onboarding_admin for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- ---------- onboarding_documents: rep manages their own checklist rows; staff can verify/reject any ----------
drop policy if exists "onb_docs_self_rw" on public.onboarding_documents;
create policy "onb_docs_self_rw" on public.onboarding_documents for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "onb_docs_staff_rw" on public.onboarding_documents;
create policy "onb_docs_staff_rw" on public.onboarding_documents for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- ---------- onboarding_tasks: anyone signed in may open a task about themselves; only staff sees/works the queue ----------
drop policy if exists "onb_tasks_insert_any" on public.onboarding_tasks;
create policy "onb_tasks_insert_any" on public.onboarding_tasks for insert
  with check (auth.uid() is not null);
drop policy if exists "onb_tasks_staff_all" on public.onboarding_tasks;
create policy "onb_tasks_staff_all" on public.onboarding_tasks for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- ---------- onboarding_audit_log: anyone signed in may log an action they took; only staff may read the trail ----------
drop policy if exists "onb_audit_insert_self" on public.onboarding_audit_log;
create policy "onb_audit_insert_self" on public.onboarding_audit_log for insert
  with check (actor = auth.uid() or actor is null);
drop policy if exists "onb_audit_staff_read" on public.onboarding_audit_log;
create policy "onb_audit_staff_read" on public.onboarding_audit_log for select
  using (public.is_manager_or_admin());

-- New profile -> give it an onboarding pipeline immediately (status defaults
-- to 'invited' / classification to 'not_assigned', both admin-only fields --
-- this is what makes it impossible for a rep to write their own classification
-- even once, since the row already exists before they can touch it).
create or replace function public.handle_new_onboarding()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.onboarding_profile (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.onboarding_admin (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_onboarding on public.profiles;
create trigger on_profile_created_onboarding
  after insert on public.profiles
  for each row execute function public.handle_new_onboarding();

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

-- ============================================================
-- Email notifications (HighLevel) — daily onboarding-reminder cron
--
-- Schedules the send-onboarding-reminders Edge Function to run once a
-- day. That function is protected by a shared secret (not a Supabase
-- JWT, since there's no user session on a cron trigger) -- generate
-- your own random value, set it as that function's CRON_SECRET secret,
-- and substitute it for <CRON_SECRET> below before running this block.
-- Never commit the real secret value to this file (this repo is public).
--
-- notify-new-task (admin task-opened emails) needs no scheduling -- the
-- client calls it directly right after a task is created.
-- ============================================================
-- create extension if not exists pg_cron with schema extensions;
-- create extension if not exists pg_net with schema extensions;
--
-- select cron.schedule(
--   'nexis-onboarding-reminders-daily',
--   '0 13 * * *', -- 13:00 UTC daily; adjust to your preferred time
--   $$
--   select net.http_post(
--     url := 'https://zalnezuwjbimvztgpkju.supabase.co/functions/v1/send-onboarding-reminders',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
