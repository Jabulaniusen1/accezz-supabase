-- Supabase Postgres schema for Accezz
-- Includes tables, types, triggers, views, and RLS policies

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- NOTE: Supabase Auth users live in auth.users
-- Domain data lives in public schema with RLS enabled

-- 1) Profiles (linked to Supabase Auth)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  country text,
  currency text,
  twofa_enabled boolean default false,
  verified boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

-- 2) Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  title text not null,
  description text not null,
  image_url text,
  date timestamptz not null,
  time text,
  venue text,
  location text,
  country text,
  currency text,
  is_virtual boolean not null default false,
  virtual_details jsonb,
  social_links jsonb,
  status text not null default 'published',
  visibility text not null default 'public',
  gallery_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slug generation
create or replace function public.generate_event_slug()
returns trigger language plpgsql as $$
declare
  base_slug text;
  candidate text;
  suffix int := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := regexp_replace(lower(new.title), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;

  while exists(select 1 from public.events where slug = candidate and id <> new.id) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  new.slug = candidate;
  return new;
end;
$$;

drop trigger if exists trg_events_slug on public.events;
create trigger trg_events_slug
before insert or update of title, slug on public.events
for each row execute function public.generate_event_slug();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
before update on public.events
for each row execute function public.handle_updated_at();

-- 3) Event gallery
create table if not exists public.event_gallery (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  image_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Maintain gallery_count on events
create or replace function public.recalc_event_gallery_count()
returns trigger language plpgsql as $$
begin
  update public.events e
  set gallery_count = (select count(*) from public.event_gallery g where g.event_id = e.id),
      updated_at = now()
  where e.id = coalesce(new.event_id, old.event_id);
  return null;
end;
$$;

drop trigger if exists trg_gallery_count_ins on public.event_gallery;
create trigger trg_gallery_count_ins
after insert on public.event_gallery
for each row execute function public.recalc_event_gallery_count();

drop trigger if exists trg_gallery_count_del on public.event_gallery;
create trigger trg_gallery_count_del
after delete on public.event_gallery
for each row execute function public.recalc_event_gallery_count();

-- 4) Ticket Types (inventory)
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  quantity int not null check (quantity >= 0),
  sold int not null default 0 check (sold >= 0),
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, name)
);

drop trigger if exists trg_ticket_types_updated_at on public.ticket_types;
create trigger trg_ticket_types_updated_at
before update on public.ticket_types
for each row execute function public.handle_updated_at();

-- 5) Orders (cart/checkout)
do $$ begin
  create type public.order_status as enum ('pending','paid','failed','refunded','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  buyer_user_id uuid references auth.users(id) on delete set null,
  buyer_full_name text,
  buyer_email text not null,
  buyer_phone text,
  currency text,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status public.order_status not null default 'pending',
  payment_provider text,
  payment_reference text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.handle_updated_at();

-- 6) Tickets (issued after successful payment)
do $$ begin
  create type public.ticket_validation_status as enum ('valid','invalid','refunded','revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete cascade,
  ticket_code text unique not null,
  qr_code_url text,
  attendee_name text,
  attendee_email text,
  price numeric(12,2) not null check (price >= 0),
  currency text,
  validation_status public.ticket_validation_status not null default 'valid',
  is_scanned boolean not null default false,
  scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
before update on public.tickets
for each row execute function public.handle_updated_at();

-- Enforce that tickets.event_id matches ticket_types.event_id (no CHECK subquery; use trigger)
create or replace function public.enforce_ticket_event_match()
returns trigger
language plpgsql
as $$
declare
  tt_event uuid;
begin
  select event_id into tt_event
  from public.ticket_types
  where id = new.ticket_type_id;

  if tt_event is null then
    raise exception 'Ticket type % not found', new.ticket_type_id;
  end if;

  if new.event_id is null then
    new.event_id := tt_event;
  end if;

  if new.event_id <> tt_event then
    raise exception 'Ticket event % does not match ticket_type event %', new.event_id, tt_event;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tickets_event_match on public.tickets;
create trigger trg_tickets_event_match
before insert or update of event_id, ticket_type_id
on public.tickets
for each row
execute function public.enforce_ticket_event_match();

-- 7) Atomic reservation + issuance helper
create or replace function public.issue_tickets_and_update_inventory(p_order_id uuid)
returns void language plpgsql as $$
declare
  r record;
begin
  if (select status from public.orders where id = p_order_id) <> 'paid' then
    raise exception 'Order must be paid before issuing tickets';
  end if;

  for r in
    select t.id as ticket_id, t.ticket_type_id
    from public.tickets t
    where t.order_id = p_order_id
  loop
    update public.ticket_types tt
    set sold = sold + 1,
        updated_at = now()
    where tt.id = r.ticket_type_id
      and (tt.quantity - tt.sold) > 0;

    if not found then
      raise exception 'Insufficient inventory for ticket_type %', r.ticket_type_id;
    end if;
  end loop;
end;
$$;

-- 8) Payment transactions (optional detailed log)
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  status text not null,
  amount numeric(12,2) not null,
  currency text,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- 9) Analytics: event page views
create table if not exists public.event_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete set null,
  ip inet,
  country text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- 10) Analytics: ticket scans
do $$ begin
  create type public.scan_result as enum ('success','duplicate','invalid','revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  scanned_by_user_id uuid not null references auth.users(id) on delete restrict,
  result public.scan_result not null,
  location text,
  created_at timestamptz not null default now()
);

-- 11) Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 12) Email marketing (basic campaigns)
do $$ begin
  create type public.email_campaign_status as enum ('draft','scheduled','sending','sent','failed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  subject text not null,
  content text not null,
  status public.email_campaign_status not null default 'draft',
  sent_count int not null default 0,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_campaigns_updated_at on public.email_campaigns;
create trigger trg_email_campaigns_updated_at
before update on public.email_campaigns
for each row execute function public.handle_updated_at();

-- 13) Aggregation Views (analytics dashboard)
create or replace view public.event_ticket_stats as
select
  e.id as event_id,
  e.title,
  coalesce(sum(tt.sold), 0) as total_sold,
  coalesce(sum(tt.sold * tt.price), 0)::numeric(12,2) as revenue,
  jsonb_agg(
    jsonb_build_object(
      'ticketTypeId', tt.id,
      'name', tt.name,
      'sold', tt.sold,
      'price', tt.price
    )
    order by tt.name
  ) filter (where tt.id is not null) as sold_by_type
from public.events e
left join public.ticket_types tt on tt.event_id = e.id
group by e.id;

create or replace view public.event_daily_sales as
select
  e.id as event_id,
  date_trunc('day', o.created_at) as day,
  sum(o.total_amount)::numeric(12,2) as revenue,
  count(distinct o.id) as orders
from public.events e
join public.orders o on o.event_id = e.id and o.status = 'paid'
group by e.id, date_trunc('day', o.created_at)
order by day desc;

-- 14) Security: RLS
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_gallery enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.event_views enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.notifications enable row level security;
alter table public.email_campaigns enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = user_id);

-- events policies
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
for select using (visibility = 'public' and status = 'published');

drop policy if exists "events_owner_read" on public.events;
create policy "events_owner_read" on public.events
for select using (auth.uid() = user_id);

drop policy if exists "events_owner_write" on public.events;
create policy "events_owner_write" on public.events
for insert with check (auth.uid() = user_id);

drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update" on public.events
for update using (auth.uid() = user_id);

drop policy if exists "events_owner_delete" on public.events;
create policy "events_owner_delete" on public.events
for delete using (auth.uid() = user_id);

-- event_gallery policies
drop policy if exists "gallery_read_public_or_owner" on public.event_gallery;
create policy "gallery_read_public_or_owner" on public.event_gallery
for select using (
  exists(select 1 from public.events e
         where e.id = event_id
           and ((e.visibility = 'public' and e.status = 'published') or e.user_id = auth.uid()))
);

drop policy if exists "gallery_owner_write" on public.event_gallery;
create policy "gallery_owner_write" on public.event_gallery
for all using (
  exists(select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
) with check (
  exists(select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

-- ticket_types policies
drop policy if exists "ticket_types_read_public_or_owner" on public.ticket_types;
create policy "ticket_types_read_public_or_owner" on public.ticket_types
for select using (
  exists(select 1 from public.events e
         where e.id = event_id
           and ((e.visibility = 'public' and e.status = 'published') or e.user_id = auth.uid()))
);

drop policy if exists "ticket_types_owner_write" on public.ticket_types;
create policy "ticket_types_owner_write" on public.ticket_types
for all using (
  exists(select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
) with check (
  exists(select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

-- orders policies
drop policy if exists "orders_buyer_or_owner_read" on public.orders;
create policy "orders_buyer_or_owner_read" on public.orders
for select using (
  buyer_user_id = auth.uid()
  or exists(select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

drop policy if exists "orders_insert_anyone" on public.orders;
create policy "orders_insert_anyone" on public.orders
for insert with check (true);

drop policy if exists "orders_update_owner_only" on public.orders;
create policy "orders_update_owner_only" on public.orders
for update using (
  exists(select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

drop policy if exists "orders_buyer_update_status" on public.orders;
create policy "orders_buyer_update_status" on public.orders
for update using (
  buyer_user_id = auth.uid()
  or (status = 'pending' and buyer_email is not null)  -- Allow unauthenticated buyers to mark pending orders as paid
) with check (
  buyer_user_id = auth.uid()
  or (status = 'paid' and buyer_email is not null)  -- Only allow setting to 'paid' status
);

-- tickets policies
drop policy if exists "tickets_buyer_or_owner_read" on public.tickets;
create policy "tickets_buyer_or_owner_read" on public.tickets
for select using (
  exists(
    select 1
    from public.orders o
    join public.events e on e.id = o.event_id
    where o.id = order_id
      and (o.buyer_user_id = auth.uid() or e.user_id = auth.uid())
  )
);

drop policy if exists "tickets_insert_for_paid_orders" on public.tickets;
create policy "tickets_insert_for_paid_orders" on public.tickets
for insert with check (
  exists(
    select 1
    from public.orders o
    where o.id = order_id
      and o.status = 'paid'
  )
);

drop policy if exists "tickets_update_for_validation" on public.tickets;
create policy "tickets_update_for_validation" on public.tickets
for update using (
  true  -- Allow updates for validation (marking as scanned)
) with check (
  true  -- Allow any updates for validation purposes
);

-- payment_transactions policies
drop policy if exists "payments_owner_read" on public.payment_transactions;
create policy "payments_owner_read" on public.payment_transactions
for select using (
  exists(select 1 from public.orders o
         join public.events e on e.id = o.event_id
         where o.id = order_id and e.user_id = auth.uid())
);

-- event_views policies
drop policy if exists "event_views_insert_anyone" on public.event_views;
create policy "event_views_insert_anyone" on public.event_views
for insert with check (true);

-- ticket_scans policies
drop policy if exists "ticket_scans_owner_read" on public.ticket_scans;
create policy "ticket_scans_owner_read" on public.ticket_scans
for select using (
  exists(select 1 from public.tickets t
         join public.orders o on o.id = t.order_id
         join public.events e on e.id = o.event_id
         where t.id = ticket_id and e.user_id = auth.uid())
);

drop policy if exists "ticket_scans_owner_insert" on public.ticket_scans;
create policy "ticket_scans_owner_insert" on public.ticket_scans
for insert with check (scanned_by_user_id = auth.uid());

-- notifications policies
drop policy if exists "notifications_user_rw" on public.notifications;
create policy "notifications_user_rw" on public.notifications
for select using (user_id = auth.uid());

drop policy if exists "notifications_user_insert" on public.notifications;
create policy "notifications_user_insert" on public.notifications
for insert with check (user_id = auth.uid());

drop policy if exists "notifications_user_update" on public.notifications;
create policy "notifications_user_update" on public.notifications
for update using (user_id = auth.uid());

-- email_campaigns policies
drop policy if exists "campaigns_owner_rw" on public.email_campaigns;
create policy "campaigns_owner_rw" on public.email_campaigns
for select using (user_id = auth.uid());

drop policy if exists "campaigns_owner_insert" on public.email_campaigns;
create policy "campaigns_owner_insert" on public.email_campaigns
for insert with check (user_id = auth.uid());

drop policy if exists "campaigns_owner_update" on public.email_campaigns;
create policy "campaigns_owner_update" on public.email_campaigns
for update using (user_id = auth.uid());

drop policy if exists "campaigns_owner_delete" on public.email_campaigns;
create policy "campaigns_owner_delete" on public.email_campaigns
for delete using (user_id = auth.uid());

-- 15) Helpers: secure ticket_code default generator
create or replace function public.generate_ticket_code()
returns text language sql as $$
  select encode(gen_random_bytes(10), 'hex');
$$;

alter table public.tickets
  alter column ticket_code set default public.generate_ticket_code();

-- 16) Inventory check on creating tickets (availability)
create or replace function public.ensure_inventory_available()
returns trigger language plpgsql as $$
declare
  available int;
begin
  select (quantity - sold) into available from public.ticket_types where id = new.ticket_type_id for update;
  if available is null then
    raise exception 'Ticket type not found';
  end if;
  if available <= 0 then
    raise exception 'Ticket type is sold out';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tickets_inventory_check on public.tickets;
create trigger trg_tickets_inventory_check
before insert on public.tickets
for each row execute function public.ensure_inventory_available();

-- 17) On marking order paid, issue and update inventory (call from backend)
-- Example usage:
--   update public.orders set status = 'paid' where id = :order_id;
--   select public.issue_tickets_and_update_inventory(:order_id);

-- 18) Storage policies (event images and gallery)
-- Enable authenticated users to write to their own scoped folders; public read
-- Note: storage.objects already has RLS enabled by Supabase

-- event-images: public read
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'event_images_public_read';
  if not found then
    create policy "event_images_public_read" on storage.objects
      for select
      using (bucket_id = 'event-images');
  end if;
end $$;

-- event-images: owner write (path prefix events/{uid}/**)
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'event_images_owner_write';
  if not found then
    create policy "event_images_owner_write" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'event-images'
        and (name like ('events/' || auth.uid()::text || '/%'))
      );
  end if;
end $$;

do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'event_images_owner_update_delete';
  if not found then
    create policy "event_images_owner_update_delete" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'event-images'
        and (name like ('events/' || auth.uid()::text || '/%'))
      )
      with check (
        bucket_id = 'event-images'
        and (name like ('events/' || auth.uid()::text || '/%'))
      );
    create policy "event_images_owner_delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'event-images'
        and (name like ('events/' || auth.uid()::text || '/%'))
      );
  end if;
end $$;

-- event-gallery: public read
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'event_gallery_public_read';
  if not found then
    create policy "event_gallery_public_read" on storage.objects
      for select
      using (bucket_id = 'event-gallery');
  end if;
end $$;

-- event-gallery: owner write (path prefix events/{uid}/{event_id}/gallery/**)
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'event_gallery_owner_write';
  if not found then
    create policy "event_gallery_owner_write" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'event-gallery'
        and (name like ('events/' || auth.uid()::text || '/%'))
      );
  end if;
end $$;

do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'event_gallery_owner_update_delete';
  if not found then
    create policy "event_gallery_owner_update_delete" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'event-gallery'
        and (name like ('events/' || auth.uid()::text || '/%'))
      )
      with check (
        bucket_id = 'event-gallery'
        and (name like ('events/' || auth.uid()::text || '/%'))
      );
    create policy "event_gallery_owner_delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'event-gallery'
        and (name like ('events/' || auth.uid()::text || '/%'))
      );
  end if;
end $$;

-- ticket-qr: public read (QR codes need to be accessible for scanning)
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'ticket_qr_public_read';
  if not found then
    create policy "ticket_qr_public_read" on storage.objects
      for select
      using (bucket_id = 'ticket-qr');
  end if;
end $$;

-- ticket-qr: allow inserts for ticket QR codes (authenticated or anyone creating tickets)
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'ticket_qr_insert';
  if not found then
    create policy "ticket_qr_insert" on storage.objects
      for insert
      with check (bucket_id = 'ticket-qr');
  end if;
end $$;

-- ticket-qr: allow updates and deletes (for authenticated users or service role)
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'ticket_qr_update_delete';
  if not found then
    create policy "ticket_qr_update_delete" on storage.objects
      for update
      using (bucket_id = 'ticket-qr')
      with check (bucket_id = 'ticket-qr');
    create policy "ticket_qr_delete" on storage.objects
      for delete
      using (bucket_id = 'ticket-qr');
  end if;
end $$;


