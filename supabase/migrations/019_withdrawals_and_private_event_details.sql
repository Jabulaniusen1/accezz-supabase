-- Migration 019: server-side withdrawals, private meeting links, booking notifications (additive)
--
-- Safe to run BEFORE deploying the new app. The parts that would break the
-- current app (blocking direct withdrawal inserts, moving meeting links out of
-- events) are in 021, which runs AFTER the deploy.
--
--   1. get_withdrawable_balance() / request_withdrawal(): the balance is
--      computed in the database from money actually collected (paid orders),
--      minus affiliate commissions and earlier withdrawals.
--   2. event_virtual_access: private table for meeting URLs / IDs of virtual
--      events, readable only by the organizer, admins and ticket holders.
--   3. location_bookings.host_notified_at: each booking notifies the host once.
--
-- Safe to re-run.

begin;

-- ---------------------------------------------------------------------------
-- 1) Withdrawals
-- ---------------------------------------------------------------------------
create or replace function public.get_withdrawable_balance(p_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_user_type text;
  v_event_revenue numeric := 0;
  v_commissions_owed numeric := 0;
  v_affiliate_earned numeric := 0;
  v_withdrawn numeric := 0;
  v_pending int := 0;
  v_available numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  -- Signed-in users may only see their own balance unless they are admins.
  -- (auth.uid() is null only for the service role / SQL editor; anon can't execute.)
  if auth.uid() is not null and v_user <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select coalesce(user_type, 'customer') into v_user_type from public.profiles where user_id = v_user;

  -- Money collected for the user's events (refunded and complimentary orders excluded)
  select coalesce(sum(o.total_amount), 0) into v_event_revenue
  from public.orders o
  join public.events e on e.id = o.event_id
  where e.user_id = v_user and o.status = 'paid';

  -- Affiliate commissions owed on those events
  select coalesce(sum(ac.amount), 0) into v_commissions_owed
  from public.affiliate_commissions ac
  join public.events e on e.id = ac.event_id
  where e.user_id = v_user;

  -- Commissions the user earned as an affiliate
  select coalesce(sum(ac.amount), 0) into v_affiliate_earned
  from public.affiliate_commissions ac
  where ac.user_id = v_user;

  select coalesce(sum(w.amount), 0), count(*) filter (where w.status = 'pending')
  into v_withdrawn, v_pending
  from public.withdrawal_requests w
  where w.user_id = v_user and w.status <> 'rejected';

  if v_user_type = 'creator' then
    v_available := v_event_revenue - v_commissions_owed - v_withdrawn;
  else
    v_available := v_affiliate_earned - v_withdrawn;
  end if;

  return jsonb_build_object(
    'user_type', v_user_type,
    'event_revenue', v_event_revenue,
    'affiliate_commissions_owed', v_commissions_owed,
    'affiliate_earned', v_affiliate_earned,
    'withdrawn', v_withdrawn,
    'pending_requests', v_pending,
    'available', greatest(v_available, 0),
    'raw_available', v_available
  );
end;
$$;

create or replace function public.request_withdrawal(p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_balance jsonb;
  v_is_affiliate boolean;
  v_fee numeric;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- One request at a time per user, even with concurrent submissions
  perform pg_advisory_xact_lock(hashtext('withdrawal:' || v_user::text));

  select * into v_profile from public.profiles where user_id = v_user;
  if not found
     or coalesce(trim(v_profile.account_number), '') = ''
     or (coalesce(trim(v_profile.bank_code), '') = '' and coalesce(trim(v_profile.bank_name), '') = '') then
    raise exception 'Add your bank details before requesting a withdrawal' using errcode = 'P0001';
  end if;

  v_balance := public.get_withdrawable_balance(v_user);

  if (v_balance ->> 'pending_requests')::int > 0 then
    raise exception 'You already have a pending withdrawal request' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a valid amount' using errcode = 'P0001';
  end if;
  if p_amount > (v_balance ->> 'available')::numeric then
    raise exception 'Amount exceeds your available balance' using errcode = 'P0001';
  end if;

  v_is_affiliate := coalesce(v_profile.user_type, 'customer') <> 'creator';
  v_fee := case when v_is_affiliate then 100 else 0 end;  -- NGN, matches the app
  if p_amount <= v_fee then
    raise exception 'Amount must be above the % withdrawal fee', v_fee using errcode = 'P0001';
  end if;

  insert into public.withdrawal_requests (user_id, amount, currency, status, source, fee_amount, net_amount)
  values (
    v_user,
    round(p_amount, 2),
    case when v_is_affiliate then 'NGN' else coalesce(v_profile.currency, 'NGN') end,
    'pending',
    case when v_is_affiliate then 'affiliate' else 'event' end,
    v_fee,
    round(p_amount, 2) - v_fee
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.get_withdrawable_balance(uuid) from public, anon;
grant execute on function public.get_withdrawable_balance(uuid) to authenticated, service_role;
revoke execute on function public.request_withdrawal(numeric) from public, anon;
grant execute on function public.request_withdrawal(numeric) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 2) Private meeting details for virtual events
-- ---------------------------------------------------------------------------
create table if not exists public.event_virtual_access (
  event_id uuid primary key references public.events(id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.event_virtual_access enable row level security;
revoke insert, update, delete on public.event_virtual_access from anon, authenticated;

-- Organizer, admin, or the holder of a valid ticket (its current owner, or
-- the buyer of a ticket that was never transferred)
drop policy if exists "event_virtual_access_read" on public.event_virtual_access;
create policy "event_virtual_access_read" on public.event_virtual_access
for select using (
  exists (select 1 from public.events e where e.id = event_id and e.user_id = auth.uid())
  or public.is_admin()
  or exists (
    select 1 from public.tickets t
    where t.event_id = event_virtual_access.event_id
      and t.validation_status = 'valid'
      and (
        t.owner_user_id = auth.uid()
        or (t.owner_user_id is null
            and exists (select 1 from public.orders o where o.id = t.order_id and o.buyer_user_id = auth.uid()))
      )
  )
);

-- ---------------------------------------------------------------------------
-- 3) Booking notifications are sent once per booking
-- ---------------------------------------------------------------------------
alter table public.location_bookings
  add column if not exists host_notified_at timestamptz;

-- Existing bookings were already notified (or never will be)
update public.location_bookings set host_notified_at = coalesce(host_notified_at, created_at)
where host_notified_at is null and created_at < now() - interval '1 hour';

commit;
