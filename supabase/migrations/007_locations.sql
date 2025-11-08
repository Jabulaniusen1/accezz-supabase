-- 007_locations.sql
-- Adds locations (event centers) and booking management

begin;

-- Locations table where creators manage physical event centers
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  description text,
  country text not null,
  city text not null,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  capacity int check (capacity is null or capacity >= 0),
  amenities jsonb,
  event_types text[] not null default '{}',
  booking_price text,
  contact_email text,
  contact_phone text,
  default_image_url text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  x_url text,
  gallery_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slug generator for locations
create or replace function public.generate_location_slug()
returns trigger language plpgsql as $$
declare
  base_slug text;
  candidate text;
  suffix int := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  candidate := base_slug;

  while exists(select 1 from public.locations where slug = candidate and id <> new.id) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  new.slug = candidate;
  return new;
end;
$$;

drop trigger if exists trg_locations_slug on public.locations;
create trigger trg_locations_slug
before insert or update of name, slug on public.locations
for each row execute function public.generate_location_slug();

drop trigger if exists trg_locations_updated_at on public.locations;
create trigger trg_locations_updated_at
before update on public.locations
for each row execute function public.handle_updated_at();

-- Gallery for each location (3-5 images recommended)
create table if not exists public.location_gallery (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  image_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.recalc_location_gallery_count()
returns trigger language plpgsql as $$
begin
  update public.locations l
  set gallery_count = (select count(*) from public.location_gallery g where g.location_id = l.id),
      updated_at = now()
  where l.id = coalesce(new.location_id, old.location_id);
  return null;
end;
$$;

drop trigger if exists trg_location_gallery_ins on public.location_gallery;
create trigger trg_location_gallery_ins
after insert on public.location_gallery
for each row execute function public.recalc_location_gallery_count();

drop trigger if exists trg_location_gallery_del on public.location_gallery;
create trigger trg_location_gallery_del
after delete on public.location_gallery
for each row execute function public.recalc_location_gallery_count();

-- Booking requests for locations
do $$ begin
  create type public.location_booking_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null; end $$;

create table if not exists public.location_bookings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_name text,
  requester_email text,
  requester_phone text,
  event_type text,
  event_date date not null,
  start_time text,
  end_time text,
  notes text,
  status public.location_booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_location_bookings_updated_at on public.location_bookings;
create trigger trg_location_bookings_updated_at
before update on public.location_bookings
for each row execute function public.handle_updated_at();

-- Associate events with locations
alter table public.events
  add column if not exists location_id uuid references public.locations(id) on delete set null;

alter table public.orders disable row level security;
alter table public.tickets disable row level security;

alter table public.locations
  add column if not exists event_types text[] default '{}',
  add column if not exists booking_price text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists x_url text;

-- Storage policies for locations-images bucket
do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'locations_images_public_read';
  if not found then
    create policy "locations_images_public_read" on storage.objects
      for select
      using (bucket_id = 'locations-images');
  end if;
end $$;

do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'locations_images_owner_write';
  if not found then
    create policy "locations_images_owner_write" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'locations-images'
        and name like ('locations/' || auth.uid()::text || '/%')
      );
  end if;
end $$;

do $$ begin
  perform 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'locations_images_owner_update_delete';
  if not found then
    create policy "locations_images_owner_update_delete" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'locations-images'
        and name like ('locations/' || auth.uid()::text || '/%')
      )
      with check (
        bucket_id = 'locations-images'
        and name like ('locations/' || auth.uid()::text || '/%')
      );
    create policy "locations_images_owner_delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'locations-images'
        and name like ('locations/' || auth.uid()::text || '/%')
      );
  end if;
end $$;

-- ================= RLS policies =================
alter table public.locations enable row level security;
alter table public.location_gallery enable row level security;
alter table public.location_bookings enable row level security;

-- Locations visibility
drop policy if exists "locations_public_read" on public.locations;
create policy "locations_public_read" on public.locations
for select using (is_active);

drop policy if exists "locations_owner_read" on public.locations;
create policy "locations_owner_read" on public.locations
for select using (auth.uid() = user_id);

drop policy if exists "locations_owner_write" on public.locations;
create policy "locations_owner_write" on public.locations
for insert with check (auth.uid() = user_id);

drop policy if exists "locations_owner_update" on public.locations;
create policy "locations_owner_update" on public.locations
for update using (auth.uid() = user_id);

drop policy if exists "locations_owner_delete" on public.locations;
create policy "locations_owner_delete" on public.locations
for delete using (auth.uid() = user_id);

-- Location gallery policies
drop policy if exists "location_gallery_public_read" on public.location_gallery;
create policy "location_gallery_public_read" on public.location_gallery
for select using (
  exists(
    select 1 from public.locations l
    where l.id = location_id
      and (l.is_active or l.user_id = auth.uid())
  )
);

drop policy if exists "location_gallery_owner_write" on public.location_gallery;
create policy "location_gallery_owner_write" on public.location_gallery
for all using (
  exists(select 1 from public.locations l where l.id = location_id and l.user_id = auth.uid())
) with check (
  exists(select 1 from public.locations l where l.id = location_id and l.user_id = auth.uid())
);

-- Location bookings policies
drop policy if exists "location_bookings_owner_read" on public.location_bookings;
create policy "location_bookings_owner_read" on public.location_bookings
for select using (
  exists(select 1 from public.locations l where l.id = location_id and l.user_id = auth.uid())
  or requester_user_id = auth.uid()
);

drop policy if exists "location_bookings_create_any" on public.location_bookings;
create policy "location_bookings_create_any" on public.location_bookings
for insert with check (true);

drop policy if exists "location_bookings_owner_update" on public.location_bookings;
create policy "location_bookings_owner_update" on public.location_bookings
for update using (
  exists(select 1 from public.locations l where l.id = location_id and l.user_id = auth.uid())
) with check (
  exists(select 1 from public.locations l where l.id = location_id and l.user_id = auth.uid())
);

drop policy if exists "location_bookings_owner_delete" on public.location_bookings;
create policy "location_bookings_owner_delete" on public.location_bookings
for delete using (
  exists(select 1 from public.locations l where l.id = location_id and l.user_id = auth.uid())
);

commit;

