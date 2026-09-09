-- Redormi Phase 1 schema: real accounts + real listings.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query),
-- then paste this whole file and click Run. Safe to re-run: every statement
-- either uses IF NOT EXISTS or is guarded against duplicates.

-- ============================================================
-- profiles: one row per user, extends Supabase's built-in auth.users.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  bio text,
  phone text,
  date_of_birth date,
  address text,
  city text,
  country text,
  roles text[] not null default array['traveler'],
  is_host boolean not null default false,
  is_switch_member boolean not null default false,
  member_since timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a bare profile row whenever someone signs up, so the app
-- never has to worry about a missing profile. The app fills in the rest
-- (name, roles, phone, etc.) with an update right after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- listings: real, host-created listings.
-- ============================================================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  property_type text not null default 'apartment',
  city text not null default '',
  region text not null default '',
  country text not null default '',
  lat double precision,
  lng double precision,
  guests integer not null default 1,
  bedrooms integer not null default 1,
  beds integer not null default 1,
  baths integer not null default 1,
  amenities text[] not null default '{}',
  photos jsonb not null default '[]',
  pricing jsonb not null default '{}',
  house_rules text[] not null default '{}',
  cancellation_policy text not null default 'moderate',
  instant_book boolean not null default false,
  accepts_offers boolean not null default true,
  min_nights integer not null default 1,
  max_nights integer not null default 90,
  switch_enabled boolean not null default false,
  status text not null default 'published',
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

drop policy if exists "Published listings are viewable by everyone" on public.listings;
create policy "Published listings are viewable by everyone"
  on public.listings for select
  using (status = 'published' or host_id = auth.uid());

drop policy if exists "Hosts can insert their own listings" on public.listings;
create policy "Hosts can insert their own listings"
  on public.listings for insert
  with check (host_id = auth.uid());

drop policy if exists "Hosts can update their own listings" on public.listings;
create policy "Hosts can update their own listings"
  on public.listings for update
  using (host_id = auth.uid());

drop policy if exists "Hosts can delete their own listings" on public.listings;
create policy "Hosts can delete their own listings"
  on public.listings for delete
  using (host_id = auth.uid());

-- ============================================================
-- Storage buckets for listing photos and avatars.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Listing photos are publicly readable" on storage.objects;
create policy "Listing photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "Authenticated users can upload listing photos" on storage.objects;
create policy "Authenticated users can upload listing photos"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');

drop policy if exists "Owners can delete their listing photos" on storage.objects;
create policy "Owners can delete their listing photos"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and owner = auth.uid());

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload their avatar" on storage.objects;
create policy "Authenticated users can upload their avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
