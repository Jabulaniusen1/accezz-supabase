-- Migration 021: lockdown — run AFTER deploying the new app
--
-- Everything here blocks paths the old app used from the browser, so it must
-- run once the new app (server-side orders, scanning, withdrawals) is live.
-- Requires 017-020.
--
--   1. RLS back on for orders and tickets. Browsers can read their own rows
--      (buyer / current ticket owner / event organizer / admin); every write
--      goes through the server (service role).
--   2. ticket_scans and the ticket-qr storage bucket become server-write only.
--   3. increment_ticket_sold (dashboard-only function) can't be called by browsers;
--      the old inventory trigger is dropped (paid orders are always honoured,
--      availability is checked when the order is created).
--   4. Withdrawal requests can only be created through request_withdrawal().
--   5. Meeting links move from events into event_virtual_access.
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- 1) RLS: orders
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists "orders_insert_anyone" on public.orders;
drop policy if exists "orders_update_owner_only" on public.orders;
drop policy if exists "orders_buyer_update_status" on public.orders;

-- Read: buyer, event owner, admin (admin_orders_select_all from 002)
drop policy if exists "orders_buyer_or_owner_read" on public.orders;
create policy "orders_buyer_or_owner_read" on public.orders
for select using (
  buyer_user_id = auth.uid()
  or exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
);

revoke insert, update, delete on public.orders from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: tickets
-- ---------------------------------------------------------------------------
alter table public.tickets enable row level security;

drop policy if exists "tickets_insert_for_paid_orders" on public.tickets;
drop policy if exists "tickets_update_for_validation" on public.tickets;

-- Read: event owner; buyer (except tickets transferred to someone else).
-- The buyer check doesn't go through events, so buyers keep their tickets
-- even if the event is later unpublished or made private.
drop policy if exists "tickets_buyer_or_owner_read" on public.tickets;
create policy "tickets_buyer_or_owner_read" on public.tickets
for select using (
  exists (select 1 from public.events e where e.id = tickets.event_id and e.user_id = auth.uid())
  or (
    (tickets.owner_user_id is null or tickets.owner_user_id = auth.uid())
    and exists (select 1 from public.orders o where o.id = tickets.order_id and o.buyer_user_id = auth.uid())
  )
);

-- Current owner (e.g. transfer recipient); admin_tickets_select_all from 002
drop policy if exists "Ticket owners can read their tickets" on public.tickets;
create policy "Ticket owners can read their tickets" on public.tickets
for select using (owner_user_id = auth.uid());

revoke insert, update, delete on public.tickets from anon, authenticated;

-- Orders paid by the previous app version already had their emails sent
update public.orders
set post_fulfilment_done_at = coalesce(post_fulfilment_done_at, updated_at)
where status in ('paid', 'refunded')
  and post_fulfilment_done_at is null
  and post_fulfilment_claimed_at is null;

-- ---------------------------------------------------------------------------
-- 2) ticket_scans and ticket-qr storage: server writes only
-- ---------------------------------------------------------------------------
drop policy if exists "ticket_scans_owner_insert" on public.ticket_scans;
revoke insert, update, delete on public.ticket_scans from anon, authenticated;

drop policy if exists "ticket_qr_insert" on storage.objects;
drop policy if exists "ticket_qr_update_delete" on storage.objects;
drop policy if exists "ticket_qr_delete" on storage.objects;

-- ---------------------------------------------------------------------------
-- 3) Inventory
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'increment_ticket_sold'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

drop trigger if exists trg_tickets_inventory_check on public.tickets;

-- ---------------------------------------------------------------------------
-- 4) Withdrawals only through request_withdrawal()
-- ---------------------------------------------------------------------------
drop policy if exists "withdrawals_insert_own" on public.withdrawal_requests;
revoke insert on public.withdrawal_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Meeting links out of the public events table
-- ---------------------------------------------------------------------------
-- Any write of meetingUrl / meetingId to events is moved into
-- event_virtual_access; events keeps only the public part (platform).
-- A save with both values blank keeps the stored ones, so forms that never
-- loaded the private details can't wipe them.
create or replace function public.sync_event_virtual_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := nullif(trim(coalesce(new.virtual_details ->> 'meetingUrl', '')), '');
  v_meeting_id text := nullif(trim(coalesce(new.virtual_details ->> 'meetingId', '')), '');
begin
  if not new.is_virtual then
    delete from public.event_virtual_access where event_id = new.id;
    return null;
  end if;

  if new.virtual_details is null
     or not (new.virtual_details ? 'meetingUrl' or new.virtual_details ? 'meetingId') then
    return null;
  end if;

  -- All values blank: the form never loaded the private details, keep them.
  -- Otherwise the submitted values replace the stored ones.
  if v_url is not null or v_meeting_id is not null then
    insert into public.event_virtual_access (event_id, details, updated_at)
    values (
      new.id,
      jsonb_strip_nulls(jsonb_build_object('meetingUrl', v_url, 'meetingId', v_meeting_id)),
      now()
    )
    on conflict (event_id) do update
      set details = excluded.details, updated_at = now();
  end if;

  update public.events
  set virtual_details = new.virtual_details - 'meetingUrl' - 'meetingId'
  where id = new.id;

  return null;
end;
$$;

drop trigger if exists trg_events_sync_virtual_access on public.events;
create trigger trg_events_sync_virtual_access
after insert or update of virtual_details, is_virtual on public.events
for each row execute function public.sync_event_virtual_access();

-- Move existing meeting details out of the public table
insert into public.event_virtual_access (event_id, details)
select e.id, jsonb_strip_nulls(jsonb_build_object(
  'meetingUrl', nullif(trim(coalesce(e.virtual_details ->> 'meetingUrl', '')), ''),
  'meetingId', nullif(trim(coalesce(e.virtual_details ->> 'meetingId', '')), '')
))
from public.events e
where e.is_virtual
  and (e.virtual_details ? 'meetingUrl' or e.virtual_details ? 'meetingId')
on conflict (event_id) do nothing;

update public.events
set virtual_details = virtual_details - 'meetingUrl' - 'meetingId'
where virtual_details ? 'meetingUrl' or virtual_details ? 'meetingId';

commit;
