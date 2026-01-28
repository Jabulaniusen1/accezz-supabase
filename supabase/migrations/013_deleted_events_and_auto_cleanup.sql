-- Migration: Deleted events table and auto-cleanup functionality
-- This creates a deleted_events table to store soft-deleted events
-- and sets up automatic deletion of events 48 hours after they finish

begin;

-- 1) Create deleted_events table (stores soft-deleted events)
create table if not exists public.deleted_events (
  id uuid primary key default gen_random_uuid(),
  original_event_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text,
  title text not null,
  description text not null,
  image_url text,
  start_time timestamptz not null,
  end_time timestamptz,
  venue text,
  location text,
  address text,
  city text,
  country text,
  currency text,
  is_virtual boolean not null default false,
  virtual_details jsonb,
  social_links jsonb,
  category_id uuid references public.event_categories(id) on delete set null,
  category_custom text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  status text not null,
  visibility text not null,
  location_visibility text not null,
  gallery_count int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id) on delete set null
);

-- Create index on original_event_id for lookups
create index if not exists idx_deleted_events_original_id on public.deleted_events(original_event_id);
create index if not exists idx_deleted_events_user_id on public.deleted_events(user_id);
create index if not exists idx_deleted_events_deleted_at on public.deleted_events(deleted_at);

-- 2) Create function to soft-delete events (move to deleted_events table)
create or replace function public.soft_delete_event(event_id uuid, deleted_by_user_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record record;
begin
  -- Fetch the event to be deleted
  select * into event_record
  from public.events
  where id = event_id;
  
  if not found then
    return false;
  end if;
  
  -- Insert into deleted_events table
  insert into public.deleted_events (
    original_event_id,
    user_id,
    slug,
    title,
    description,
    image_url,
    start_time,
    end_time,
    venue,
    location,
    address,
    city,
    country,
    currency,
    is_virtual,
    virtual_details,
    social_links,
    category_id,
    category_custom,
    latitude,
    longitude,
    status,
    visibility,
    location_visibility,
    gallery_count,
    created_at,
    updated_at,
    deleted_by
  ) values (
    event_record.id,
    event_record.user_id,
    event_record.slug,
    event_record.title,
    event_record.description,
    event_record.image_url,
    event_record.start_time,
    event_record.end_time,
    event_record.venue,
    event_record.location,
    event_record.address,
    event_record.city,
    event_record.country,
    event_record.currency,
    event_record.is_virtual,
    event_record.virtual_details,
    event_record.social_links,
    event_record.category_id,
    event_record.category_custom,
    event_record.latitude,
    event_record.longitude,
    event_record.status,
    event_record.visibility,
    event_record.location_visibility,
    event_record.gallery_count,
    event_record.created_at,
    event_record.updated_at,
    deleted_by_user_id
  );
  
  -- Actually delete from events table (cascade will handle related records)
  delete from public.events where id = event_id;
  
  return true;
exception
  when others then
    raise exception 'Failed to soft delete event: %', SQLERRM;
end;
$$;

-- Grant execute permission
grant execute on function public.soft_delete_event(uuid, uuid) to authenticated, service_role;

-- 3) Create function to automatically delete events 48 hours after they finish
create or replace function public.auto_delete_past_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int := 0;
  event_record record;
begin
  -- Find events that finished more than 48 hours ago
  -- Use end_time if available, otherwise use start_time
  for event_record in
    select id, user_id, end_time, start_time
    from public.events
    where (
      (end_time is not null and end_time < now() - interval '48 hours') or
      (end_time is null and start_time < now() - interval '48 hours')
    )
  loop
    -- Soft delete the event (move to deleted_events)
    perform public.soft_delete_event(event_record.id, null);
    deleted_count := deleted_count + 1;
  end loop;
  
  return jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'timestamp', now()
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', now()
    );
end;
$$;

-- Grant execute permission
grant execute on function public.auto_delete_past_events() to postgres, service_role;

-- Add comment
comment on function public.auto_delete_past_events() is 
  'Automatically soft-deletes events that finished more than 48 hours ago. Should be run periodically via cron job.';

-- 4) Enable pg_cron extension (if available)
do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    raise notice 'pg_cron extension setup: %', SQLERRM;
end;
$$;

-- Schedule the cron job to run every hour
-- IMPORTANT: You must schedule this manually via Supabase Dashboard
-- Go to Database > Cron Jobs > New Cron Job
-- Schedule: 0 * * * * (every hour)
-- Command: SELECT public.auto_delete_past_events();
--
-- Or run this SQL manually after the migration (if cron.schedule is available):
-- SELECT cron.schedule(
--   'auto-delete-past-events',
--   '0 * * * *',
--   'SELECT public.auto_delete_past_events();'
-- );

commit;

