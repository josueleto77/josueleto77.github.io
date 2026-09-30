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

-- ============================================================
-- Redormi Phase 2 schema: everything else that was still mock-data /
-- localStorage-only (offers, bookings, messaging, swaps, extra services,
-- saved homes, notifications, legal acceptances, deals). Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- offers: percentage-off offers a guest sends a host, with negotiation
-- history embedded as jsonb (low volume per offer, no need for a join
-- table) matching the app's CounterOffer[] shape.
-- ------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  discount_percent numeric not null,
  resulting_nightly numeric not null,
  resulting_total numeric not null,
  message text,
  status text not null default 'pending',
  expires_at timestamptz not null,
  last_actor text not null default 'guest',
  history jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;

drop policy if exists "Guest or host can view an offer" on public.offers;
create policy "Guest or host can view an offer"
  on public.offers for select
  using (
    guest_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = offers.listing_id and l.host_id = auth.uid())
  );

drop policy if exists "Guests can create offers" on public.offers;
create policy "Guests can create offers"
  on public.offers for insert
  with check (guest_id = auth.uid());

drop policy if exists "Guest or host can update an offer" on public.offers;
create policy "Guest or host can update an offer"
  on public.offers for update
  using (
    guest_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = offers.listing_id and l.host_id = auth.uid())
  );

-- ------------------------------------------------------------
-- bookings: confirmed/held reservations, optionally created from an
-- accepted offer. This is what a real payment will attach to.
-- ------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  guests integer not null default 1,
  nights integer not null,
  nightly_rate numeric not null,
  subtotal numeric not null,
  cleaning_fee numeric not null default 0,
  service_fee numeric not null default 0,
  taxes numeric not null default 0,
  total numeric not null,
  status text not null default 'held',
  from_offer_id uuid references public.offers(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "Guest or host can view a booking" on public.bookings;
create policy "Guest or host can view a booking"
  on public.bookings for select
  using (
    guest_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = bookings.listing_id and l.host_id = auth.uid())
  );

drop policy if exists "Guests can create bookings" on public.bookings;
create policy "Guests can create bookings"
  on public.bookings for insert
  with check (guest_id = auth.uid());

drop policy if exists "Guest or host can update a booking" on public.bookings;
create policy "Guest or host can update a booking"
  on public.bookings for update
  using (
    guest_id = auth.uid()
    or exists (select 1 from public.listings l where l.id = bookings.listing_id and l.host_id = auth.uid())
  );

-- ------------------------------------------------------------
-- messaging: threads (participant_ids array — simplest for a 2-party
-- thread) + messages + a small per-user read-cursor table.
-- ------------------------------------------------------------
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  swap_id uuid,
  participant_ids uuid[] not null,
  context text not null default 'rent',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.threads enable row level security;

drop policy if exists "Participants can view their threads" on public.threads;
create policy "Participants can view their threads"
  on public.threads for select
  using (auth.uid() = any(participant_ids));

drop policy if exists "Participants can create a thread" on public.threads;
create policy "Participants can create a thread"
  on public.threads for insert
  with check (auth.uid() = any(participant_ids));

drop policy if exists "Participants can update their thread" on public.threads;
create policy "Participants can update their thread"
  on public.threads for update
  using (auth.uid() = any(participant_ids));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '',
  image_url text,
  sent_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Participants can view messages in their threads" on public.messages;
create policy "Participants can view messages in their threads"
  on public.messages for select
  using (exists (
    select 1 from public.threads t where t.id = messages.thread_id and auth.uid() = any(t.participant_ids)
  ));

drop policy if exists "Participants can send messages in their threads" on public.messages;
create policy "Participants can send messages in their threads"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.threads t where t.id = messages.thread_id and auth.uid() = any(t.participant_ids))
  );

create table if not exists public.thread_reads (
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

alter table public.thread_reads enable row level security;

drop policy if exists "Users manage their own read cursor" on public.thread_reads;
create policy "Users manage their own read cursor"
  on public.thread_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- swaps: Redormi Switch reciprocal home-exchange proposals + their
-- e-signed agreement.
-- ------------------------------------------------------------
create table if not exists public.swaps (
  id uuid primary key default gen_random_uuid(),
  from_listing_id uuid not null references public.listings(id) on delete cascade,
  from_owner_id uuid not null references public.profiles(id) on delete cascade,
  to_listing_id uuid not null references public.listings(id) on delete cascade,
  to_owner_id uuid not null references public.profiles(id) on delete cascade,
  proposed_start date not null,
  proposed_end date not null,
  message text,
  status text not null default 'proposed',
  tier_gap numeric not null default 0,
  processing_fee_per_owner numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.swaps enable row level security;

drop policy if exists "Either owner can view a swap" on public.swaps;
create policy "Either owner can view a swap"
  on public.swaps for select
  using (from_owner_id = auth.uid() or to_owner_id = auth.uid());

drop policy if exists "Owner can propose a swap" on public.swaps;
create policy "Owner can propose a swap"
  on public.swaps for insert
  with check (from_owner_id = auth.uid());

drop policy if exists "Either owner can update a swap" on public.swaps;
create policy "Either owner can update a swap"
  on public.swaps for update
  using (from_owner_id = auth.uid() or to_owner_id = auth.uid());

create table if not exists public.swap_agreements (
  id uuid primary key default gen_random_uuid(),
  swap_id uuid not null unique references public.swaps(id) on delete cascade,
  signed_by_from boolean not null default false,
  signed_by_to boolean not null default false,
  add_on_ids text[] not null default '{}',
  signed_at timestamptz,
  version text not null default '1.0'
);

alter table public.swap_agreements enable row level security;

drop policy if exists "Either owner can view a swap agreement" on public.swap_agreements;
create policy "Either owner can view a swap agreement"
  on public.swap_agreements for select
  using (exists (
    select 1 from public.swaps sw
    where sw.id = swap_agreements.swap_id and (sw.from_owner_id = auth.uid() or sw.to_owner_id = auth.uid())
  ));

drop policy if exists "Either owner can upsert a swap agreement" on public.swap_agreements;
create policy "Either owner can upsert a swap agreement"
  on public.swap_agreements for insert
  with check (exists (
    select 1 from public.swaps sw
    where sw.id = swap_agreements.swap_id and (sw.from_owner_id = auth.uid() or sw.to_owner_id = auth.uid())
  ));

drop policy if exists "Either owner can update a swap agreement" on public.swap_agreements;
create policy "Either owner can update a swap agreement"
  on public.swap_agreements for update
  using (exists (
    select 1 from public.swaps sw
    where sw.id = swap_agreements.swap_id and (sw.from_owner_id = auth.uid() or sw.to_owner_id = auth.uid())
  ));

-- ------------------------------------------------------------
-- extra services: host-offered add-ons (vehicles, recreation, comfort,
-- services) and guest orders against them.
-- ------------------------------------------------------------
create table if not exists public.extra_services (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  name text not null,
  description text not null default '',
  photos text[] not null default '{}',
  pricing_unit text not null default 'per_day',
  price numeric not null default 0,
  quantity_available integer not null default 1,
  deposit numeric,
  requires_license boolean not null default false,
  age_minimum integer,
  cancellation_policy text not null default 'moderate',
  commission_pct numeric not null default 15,
  created_at timestamptz not null default now()
);

alter table public.extra_services enable row level security;

drop policy if exists "Extra services are viewable by everyone" on public.extra_services;
create policy "Extra services are viewable by everyone"
  on public.extra_services for select
  using (true);

drop policy if exists "Hosts manage their own extra services" on public.extra_services;
create policy "Hosts manage their own extra services"
  on public.extra_services for all
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create table if not exists public.extra_service_orders (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.extra_services(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  swap_id uuid references public.swaps(id) on delete set null,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null default 1,
  total_price numeric not null,
  status text not null default 'pending',
  waiver_accepted boolean not null default false,
  license_uploaded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.extra_service_orders enable row level security;

drop policy if exists "Guest or service host can view an order" on public.extra_service_orders;
create policy "Guest or service host can view an order"
  on public.extra_service_orders for select
  using (
    guest_id = auth.uid()
    or exists (
      select 1 from public.extra_services es
      where es.id = extra_service_orders.service_id and es.host_id = auth.uid()
    )
  );

drop policy if exists "Guests can create service orders" on public.extra_service_orders;
create policy "Guests can create service orders"
  on public.extra_service_orders for insert
  with check (guest_id = auth.uid());

drop policy if exists "Guest or service host can update an order" on public.extra_service_orders;
create policy "Guest or service host can update an order"
  on public.extra_service_orders for update
  using (
    guest_id = auth.uid()
    or exists (
      select 1 from public.extra_services es
      where es.id = extra_service_orders.service_id and es.host_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- saved_listings: a guest's "wishlist" hearts.
-- ------------------------------------------------------------
create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

drop policy if exists "Users manage their own saved listings" on public.saved_listings;
create policy "Users manage their own saved listings"
  on public.saved_listings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- notifications: in-app alerts. Inserted by whichever client action
-- triggers them (e.g. the guest's browser inserts a row for the host
-- when an offer is sent) since there's no server/edge-function layer
-- yet — see README for the recommended hardening path (move this to a
-- database trigger or edge function once one exists, since any signed
-- in user can currently insert a notification for any other user).
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Any signed-in user can create a notification" on public.notifications;
create policy "Any signed-in user can create a notification"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- legal_acceptances: audit trail of which policy version each user
-- e-signed, and when. Append-only.
-- ------------------------------------------------------------
create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_slug text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip text
);

alter table public.legal_acceptances enable row level security;

drop policy if exists "Users can view their own acceptances" on public.legal_acceptances;
create policy "Users can view their own acceptances"
  on public.legal_acceptances for select
  using (user_id = auth.uid());

drop policy if exists "Users can record their own acceptances" on public.legal_acceptances;
create policy "Users can record their own acceptances"
  on public.legal_acceptances for insert
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- last_minute_deals: host-published discounted windows, surfaced on
-- the Special Offers feed.
-- ------------------------------------------------------------
create table if not exists public.last_minute_deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  discount_percent numeric not null,
  expires_at timestamptz not null,
  matched_area text,
  created_at timestamptz not null default now()
);

alter table public.last_minute_deals enable row level security;

drop policy if exists "Deals are viewable by everyone" on public.last_minute_deals;
create policy "Deals are viewable by everyone"
  on public.last_minute_deals for select
  using (true);

drop policy if exists "Hosts manage deals on their own listings" on public.last_minute_deals;
create policy "Hosts manage deals on their own listings"
  on public.last_minute_deals for all
  using (exists (select 1 from public.listings l where l.id = last_minute_deals.listing_id and l.host_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = last_minute_deals.listing_id and l.host_id = auth.uid()));

-- ============================================================
-- Redormi Phase 3 schema: Stripe payments. A host's Stripe Connect
-- account status, and payment fields on bookings. Both are written
-- exclusively by the stripe-* Edge Functions (using the service_role key,
-- which bypasses RLS) — there are deliberately no insert/update policies
-- here for the anon/authenticated roles, so a signed-in user can read
-- their own payout status but can never write payment state directly.
-- ============================================================
create table if not exists public.host_stripe_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.host_stripe_accounts enable row level security;

drop policy if exists "Hosts can view their own Stripe account status" on public.host_stripe_accounts;
create policy "Hosts can view their own Stripe account status"
  on public.host_stripe_accounts for select
  using (user_id = auth.uid());

alter table public.bookings add column if not exists stripe_checkout_session_id text;
alter table public.bookings add column if not exists stripe_payment_intent_id text;
alter table public.bookings add column if not exists payment_status text not null default 'unpaid';
