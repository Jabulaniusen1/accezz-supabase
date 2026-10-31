-- Migration 017: security lockdown (database-only fixes)
--
-- Closes the holes that can be fixed without changing app code. Safe to run
-- with the current app, before deploying the new one:
--   1. Users could make themselves admin by updating profiles.is_admin.
--   2. soft_delete_event let anyone delete any event (and its orders/tickets).
--   3. auto_delete_past_events was callable by anyone and wiped paid orders.
--   4. Deleting a ticket type silently deleted the tickets issued for it.
--   5. Internal SECURITY DEFINER helpers were callable through the public API.
--   6. Revenue views bypassed RLS; config/deleted_events/event_categories had no RLS.
--   7. Organizers could edit ticket_types.sold; affiliates could edit their own earnings.
--   8. Pending (unapproved) locations could be switched live by their assigned owner.
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- Helper: true when the current statement runs as a trusted backend role
-- (service-role API key, SQL editor, or a SECURITY DEFINER function owned by
-- postgres), i.e. any role that already bypasses RLS. Deliberately NOT
-- security definer, so current_user is the caller.
-- ---------------------------------------------------------------------------
create or replace function public.is_privileged_role()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select r.rolsuper or r.rolbypassrls from pg_roles r where r.rolname = current_user),
    false
  ) or current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

-- ---------------------------------------------------------------------------
-- 1) profiles: only trusted roles may change is_admin / verified
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.verified := false;
  else
    new.is_admin := old.is_admin;
    new.verified := old.verified;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_columns on public.profiles;
create trigger trg_profiles_protect_columns
before insert or update on public.profiles
for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- 2) Events with sales can never be deleted (their orders and tickets would
--    cascade away). Applies to every path: direct deletes, soft_delete_event,
--    auto-cleanup and account deletion.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_deleting_events_with_sales()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.tickets t where t.event_id = old.id)
     or exists (
       select 1 from public.orders o
       where o.event_id = old.id and o.status in ('paid', 'refunded')
     ) then
    raise exception 'This event has sold tickets, so it cannot be deleted. Unpublish it or make it private instead.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_events_prevent_delete_with_sales on public.events;
create trigger trg_events_prevent_delete_with_sales
before delete on public.events
for each row execute function public.prevent_deleting_events_with_sales();

-- Internal: copy an event into deleted_events, then delete it. Not callable
-- through the API; soft_delete_event and auto_delete_past_events wrap it.
create or replace function public.archive_and_delete_event(p_event_id uuid, p_deleted_by uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deleted_events (
    original_event_id, user_id, slug, title, description, image_url,
    start_time, end_time, venue, location, address, city, country, currency,
    is_virtual, virtual_details, social_links, category_id, category_custom,
    latitude, longitude, status, visibility, location_visibility,
    gallery_count, created_at, updated_at, deleted_by
  )
  select
    e.id, e.user_id, e.slug, e.title, e.description, e.image_url,
    e.start_time, e.end_time, e.venue, e.location, e.address, e.city, e.country, e.currency,
    e.is_virtual, e.virtual_details, e.social_links, e.category_id, e.category_custom,
    e.latitude, e.longitude, e.status, e.visibility, e.location_visibility,
    e.gallery_count, e.created_at, e.updated_at, p_deleted_by
  from public.events e
  where e.id = p_event_id;

  if not found then
    return false;
  end if;

  delete from public.events where id = p_event_id;
  return true;
end;
$$;

-- Public RPC (same signature the app already calls). The caller must own the
-- event or be an admin; deleted_by is always the real caller, never the argument.
create or replace function public.soft_delete_event(event_id uuid, deleted_by_user_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select e.user_id into v_owner
  from public.events e
  where e.id = soft_delete_event.event_id;

  if not found then
    return false;
  end if;

  if auth.uid() is null or (auth.uid() <> v_owner and not public.is_admin()) then
    raise exception 'You do not have permission to delete this event'
      using errcode = '42501';
  end if;

  return public.archive_and_delete_event(soft_delete_event.event_id, auth.uid());
end;
$$;

-- Auto-cleanup: only removes ended events that never sold anything.
-- Events without an end_time are treated as lasting 7 days.
create or replace function public.auto_delete_past_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  deleted_count int := 0;
  kept_count int := 0;
begin
  for r in
    select e.id
    from public.events e
    where coalesce(e.end_time, e.start_time + interval '7 days') < now() - interval '48 hours'
  loop
    if exists (select 1 from public.tickets t where t.event_id = r.id)
       or exists (
         select 1 from public.orders o
         where o.event_id = r.id and o.status in ('paid', 'refunded')
       ) then
      kept_count := kept_count + 1;
      continue;
    end if;

    perform public.archive_and_delete_event(r.id, null);
    deleted_count := deleted_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'kept_with_sales', kept_count,
    'timestamp', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Deleting a ticket type must not delete the tickets issued for it
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
begin
  select c.conname into v_name
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.tickets'::regclass
    and c.contype = 'f'
    and a.attname = 'ticket_type_id';

  if v_name is not null then
    execute format('alter table public.tickets drop constraint %I', v_name);
  end if;

  -- NOT VALID: enforced for new rows without failing on tickets whose ticket
  -- type was lost in the past (see 012_recover_ticket_types)
  alter table public.tickets
    add constraint tickets_ticket_type_id_fkey
    foreign key (ticket_type_id) references public.ticket_types(id) on delete no action
    not valid;

  begin
    alter table public.tickets validate constraint tickets_ticket_type_id_fkey;
  exception when foreign_key_violation then
    raise notice 'Some tickets reference missing ticket types; run 012_recover_ticket_types, then: alter table public.tickets validate constraint tickets_ticket_type_id_fkey;';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 4) ticket_types: organizers cannot write `sold`, and cannot set quantity
--    below what has already been sold
-- ---------------------------------------------------------------------------
create or replace function public.protect_ticket_type_inventory()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.sold := 0;
  else
    new.sold := old.sold;
    if new.quantity is distinct from old.quantity and new.quantity < new.sold then
      raise exception 'Quantity for "%" cannot be lower than the % tickets already sold', new.name, new.sold
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ticket_types_protect_inventory on public.ticket_types;
create trigger trg_ticket_types_protect_inventory
before insert or update on public.ticket_types
for each row execute function public.protect_ticket_type_inventory();

-- ---------------------------------------------------------------------------
-- 5) locations: owners can hide a location, but only admins (or the
--    service-role admin API) can switch a pending location live
-- ---------------------------------------------------------------------------
create or replace function public.protect_location_approval()
returns trigger
language plpgsql
as $$
begin
  if new.is_active and not old.is_active
     and not public.is_privileged_role()
     and not public.is_admin() then
    new.is_active := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_locations_protect_approval on public.locations;
create trigger trg_locations_protect_approval
before update on public.locations
for each row execute function public.protect_location_approval();

-- Booking requests: always start as pending, for an active location,
-- and can't be filed under someone else's account
drop policy if exists "location_bookings_create_any" on public.location_bookings;
create policy "location_bookings_create_any" on public.location_bookings
for insert with check (
  status = 'pending'
  and (requester_user_id is null or requester_user_id = auth.uid())
  and exists (select 1 from public.locations l where l.id = location_id and l.is_active)
);

-- ---------------------------------------------------------------------------
-- 6) Lock down internal functions. Postgres and Supabase grant EXECUTE to
--    anon/authenticated by default, which exposes them at /rest/v1/rpc/*.
-- ---------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.archive_and_delete_event(uuid, uuid)',
    'public.auto_delete_past_events()',
    'public.get_user_info_by_email(text)',
    'public.increment_affiliate_stats(uuid, numeric)',
    'public.send_abandoned_cart_emails()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;

  if to_regprocedure('public.get_user_info_by_email(text)') is not null then
    alter function public.get_user_info_by_email(text) set search_path = public;
  end if;
  if to_regprocedure('public.increment_affiliate_stats(uuid, numeric)') is not null then
    alter function public.increment_affiliate_stats(uuid, numeric) set search_path = public;
  end if;
end $$;

-- soft_delete_event checks the caller itself; anon never needs it
revoke execute on function public.soft_delete_event(uuid, uuid) from public, anon;
grant execute on function public.soft_delete_event(uuid, uuid) to authenticated, service_role;

-- Unused and unsafe (no caller check, not idempotent)
drop function if exists public.issue_tickets_and_update_inventory(uuid);

-- ---------------------------------------------------------------------------
-- 7) Views and tables that bypassed or lacked RLS
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.event_ticket_stats') is not null then
    revoke all on public.event_ticket_stats from anon, authenticated;
  end if;
  if to_regclass('public.event_daily_sales') is not null then
    revoke all on public.event_daily_sales from anon, authenticated;
  end if;
end $$;

drop view if exists public.recovery_status;

-- config: backend only
do $$ begin
  if to_regclass('public.config') is not null then
    alter table public.config enable row level security;
    revoke all on public.config from anon, authenticated;
  end if;
end $$;

-- deleted_events: written only by archive_and_delete_event; readable by owner/admin
alter table public.deleted_events enable row level security;
revoke insert, update, delete on public.deleted_events from anon, authenticated;
drop policy if exists "deleted_events_owner_or_admin_read" on public.deleted_events;
create policy "deleted_events_owner_or_admin_read" on public.deleted_events
for select using (user_id = auth.uid() or public.is_admin());

-- event_categories: public read, admin write
alter table public.event_categories enable row level security;
drop policy if exists "event_categories_public_read" on public.event_categories;
create policy "event_categories_public_read" on public.event_categories
for select using (true);
drop policy if exists "event_categories_admin_write" on public.event_categories;
create policy "event_categories_admin_write" on public.event_categories
for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8) Affiliates: rows are created/updated only by the server (service role)
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.affiliates') is not null then
    drop policy if exists "Anyone can read affiliates" on public.affiliates;
    drop policy if exists "Users manage their own affiliate rows" on public.affiliates;
    drop policy if exists "affiliates_select_own" on public.affiliates;
    create policy "affiliates_select_own" on public.affiliates
    for select using (user_id = auth.uid());
    drop policy if exists "affiliates_select_event_owner" on public.affiliates;
    create policy "affiliates_select_event_owner" on public.affiliates
    for select using (
      exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
    );
  end if;

  -- Event owners need to see commissions on their events so they are
  -- subtracted from the organizer's balance
  if to_regclass('public.affiliate_commissions') is not null then
    drop policy if exists "affiliate_commissions_event_owner_read" on public.affiliate_commissions;
    create policy "affiliate_commissions_event_owner_read" on public.affiliate_commissions
    for select using (
      exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
    );
  end if;

  -- Commission settings must be sane (existing rows are not re-checked)
  if to_regclass('public.affiliate_settings') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'affiliate_settings_commission_value_check'
     ) then
    alter table public.affiliate_settings
      add constraint affiliate_settings_commission_value_check
      check (commission_value >= 0 and (commission_type <> 'percentage' or commission_value <= 100))
      not valid;
  end if;
end $$;

commit;
