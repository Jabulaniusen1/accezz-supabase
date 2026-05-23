-- Migration: Allow admins to edit event details and related rows in the event editor

-- Admin can update any event
drop policy if exists "admin_events_update_all" on public.events;
create policy "admin_events_update_all" on public.events
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can manage any ticket types (needed by update event flow)
drop policy if exists "admin_ticket_types_write_all" on public.ticket_types;
create policy "admin_ticket_types_write_all" on public.ticket_types
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- If affiliate_settings exists, allow admins to manage it too
do $$
begin
  if to_regclass('public.affiliate_settings') is not null then
    execute 'drop policy if exists "admin_affiliate_settings_write_all" on public.affiliate_settings';
    execute 'create policy "admin_affiliate_settings_write_all" on public.affiliate_settings
      for all
      using (public.is_admin())
      with check (public.is_admin())';
  end if;
end $$;
