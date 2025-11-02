-- Migration: Add admin support to profiles and create admin RLS policies

-- Add is_admin column to profiles table
alter table public.profiles 
  add column if not exists is_admin boolean not null default false;

-- Create index for admin lookup
create index if not exists idx_profiles_is_admin on public.profiles(is_admin) where is_admin = true;

-- Create a security definer function to check admin status (bypasses RLS)
-- This function uses SECURITY DEFINER to run with elevated privileges and avoid RLS recursion
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  is_admin_user boolean;
  current_user_id uuid;
begin
  -- Get current user ID
  current_user_id := auth.uid();
  
  if current_user_id is null then
    return false;
  end if;
  
  -- Directly query profiles without RLS interference
  -- SECURITY DEFINER ensures this runs with elevated privileges that bypass RLS
  select exists (
    select 1 from public.profiles 
    where user_id = current_user_id and is_admin = true
  ) into is_admin_user;
  
  return coalesce(is_admin_user, false);
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.is_admin() to authenticated;

-- Admin policies for profiles (uses the function to avoid recursion)
drop policy if exists "admin_profiles_select_all" on public.profiles;
create policy "admin_profiles_select_all" on public.profiles
  for select using (public.is_admin());

-- Admin policies for events (read all, delete any)
drop policy if exists "admin_events_select_all" on public.events;
create policy "admin_events_select_all" on public.events
  for select using (public.is_admin());

drop policy if exists "admin_events_delete_all" on public.events;
create policy "admin_events_delete_all" on public.events
  for delete using (public.is_admin());

-- Admin policies for orders (read all)
drop policy if exists "admin_orders_select_all" on public.orders;
create policy "admin_orders_select_all" on public.orders
  for select using (public.is_admin());

-- Admin policies for tickets (read all)
drop policy if exists "admin_tickets_select_all" on public.tickets;
create policy "admin_tickets_select_all" on public.tickets
  for select using (public.is_admin());

-- Admin policies for ticket_types (read all)
drop policy if exists "admin_ticket_types_select_all" on public.ticket_types;
create policy "admin_ticket_types_select_all" on public.ticket_types
  for select using (public.is_admin());

-- Admin can read auth.users email (via service role in API routes, not RLS)
-- Note: We'll need to use service role client in API routes for auth.users access

