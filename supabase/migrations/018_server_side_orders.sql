-- Migration 018: server-side order fulfilment (additive)
--
-- Adds what the new app needs; changes nothing the current app relies on, so
-- it is safe to run BEFORE deploying. The lockdown (RLS on orders/tickets)
-- is in 021, which runs AFTER the deploy.
--
--   1. fulfil_order(): one locked transaction that checks the payment, issues
--      the tickets, updates inventory and marks the order paid. Idempotent.
--   2. refund_order(): marks an order refunded and releases its inventory.
--   3. Payments that can't be matched to an order are logged in
--      payment_transactions with status 'unmatched' (for refunds / support).
--   4. orders.post_fulfilment_* columns: ticket emails / QR codes are retried
--      if the request that issued the tickets died before sending them.
--   5. Re-syncs ticket_types.sold with the tickets that actually exist.
--
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- Ticket codes: 8 characters, A-Z / 0-9, unique
-- ---------------------------------------------------------------------------
create or replace function public.generate_short_ticket_code()
returns text
language plpgsql
volatile
set search_path = public, extensions  -- Supabase installs pgcrypto in "extensions"
as $$
declare
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(chars, (get_byte(bytes, i) % 36) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.tickets where ticket_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record a payment we received but could not turn into tickets
-- ---------------------------------------------------------------------------
create or replace function public.log_unmatched_payment(
  p_order_id uuid,
  p_provider text,
  p_reference text,
  p_amount numeric,
  p_currency text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_provider <> 'paystack' or p_reference is null then
    return;
  end if;
  if exists (select 1 from public.payment_transactions where provider_ref = p_reference) then
    return;
  end if;
  insert into public.payment_transactions (order_id, provider, provider_ref, status, amount, currency, raw)
  values (p_order_id, p_provider, p_reference, 'unmatched', coalesce(p_amount, 0), upper(coalesce(p_currency, 'NGN')),
          jsonb_build_object('reason', p_reason, 'at', now()));
end;
$$;

-- ---------------------------------------------------------------------------
-- fulfil_order(order, provider, reference, amount_paid, currency)
--
-- provider: 'paystack' (amount + currency are checked against the order),
--           'free'     (order and ticket type must both cost 0; respects stock),
--           'admin'    (complimentary ticket issued through the admin API).
--
-- Returns jsonb { status: fulfilled | already_fulfilled | not_found |
--   invalid_status | ticket_type_missing | not_free | sold_out |
--   amount_mismatch, ... }
-- ---------------------------------------------------------------------------
create or replace function public.fulfil_order(
  p_order_id uuid,
  p_provider text,
  p_reference text default null,
  p_amount_paid numeric default null,
  p_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_type public.ticket_types%rowtype;
  v_meta jsonb;
  v_currency text;
  v_qty int;
  v_unit_price numeric;
  v_attendees jsonb;
  v_attendee jsonb;
  v_gender text;
  v_name text;
  v_email text;
  v_ticket_id uuid;
  v_ticket_ids uuid[] := '{}';
begin
  -- Lock the order: concurrent webhook/verify calls queue here
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if exists (select 1 from public.tickets t where t.order_id = p_order_id) then
    -- A second, different payment for an order that already has tickets
    if p_reference is distinct from v_order.payment_reference then
      perform public.log_unmatched_payment(p_order_id, p_provider, p_reference, p_amount_paid, p_currency, 'already_fulfilled');
    end if;
    return jsonb_build_object('status', 'already_fulfilled');
  end if;

  if v_order.status not in ('pending', 'paid') then
    perform public.log_unmatched_payment(p_order_id, p_provider, p_reference, p_amount_paid, p_currency, 'order_' || v_order.status);
    return jsonb_build_object('status', 'invalid_status', 'order_status', v_order.status);
  end if;

  v_meta := coalesce(v_order.meta, '{}'::jsonb);
  v_currency := upper(coalesce(v_order.currency, 'NGN'));
  v_qty := greatest(coalesce((v_meta ->> 'quantity')::int, 1), 1);

  -- Ticket type: by id for new orders, by name for orders created before 018
  if v_meta ? 'ticketTypeId' then
    select * into v_type from public.ticket_types
    where id = (v_meta ->> 'ticketTypeId')::uuid and event_id = v_order.event_id
    for update;
  else
    select * into v_type from public.ticket_types
    where event_id = v_order.event_id and name = coalesce(v_meta ->> 'ticketTypeName', 'General')
    for update;
  end if;
  if not found then
    perform public.log_unmatched_payment(p_order_id, p_provider, p_reference, p_amount_paid, p_currency, 'ticket_type_missing');
    return jsonb_build_object('status', 'ticket_type_missing');
  end if;

  v_unit_price := coalesce((v_meta ->> 'unitPrice')::numeric, v_type.price);

  -- Payment checks
  if p_provider = 'free' then
    if v_order.total_amount <> 0 or v_unit_price <> 0 then
      return jsonb_build_object('status', 'not_free');
    end if;
    -- Nobody has paid, so free tickets respect the limit strictly
    if v_type.quantity - v_type.sold < v_qty then
      update public.orders set status = 'cancelled' where id = p_order_id;
      return jsonb_build_object('status', 'sold_out', 'available', greatest(v_type.quantity - v_type.sold, 0));
    end if;
  elsif p_provider = 'admin' then
    null;
  else
    if p_amount_paid is null
       or p_amount_paid < v_order.total_amount
       or upper(coalesce(p_currency, '')) <> v_currency
       -- Orders priced in the browser (before 018): the total itself is untrusted
       or (coalesce(v_meta ->> 'pricedBy', '') <> 'server' and v_order.total_amount < v_type.price * v_qty)
    then
      update public.orders
      set status = 'failed',
          meta = v_meta || jsonb_build_object('paymentIssue', jsonb_build_object(
            'reason', 'amount_mismatch',
            'expected', greatest(v_order.total_amount, v_type.price * v_qty),
            'paid', p_amount_paid,
            'currency', p_currency,
            'reference', p_reference,
            'at', now()))
      where id = p_order_id;
      perform public.log_unmatched_payment(p_order_id, p_provider, p_reference, p_amount_paid, p_currency, 'amount_mismatch');
      return jsonb_build_object('status', 'amount_mismatch',
        'expected', v_order.total_amount, 'paid', p_amount_paid, 'currency', p_currency);
    end if;
  end if;

  v_attendees := case when jsonb_typeof(v_meta -> 'attendees') = 'array' then v_meta -> 'attendees' else '[]'::jsonb end;

  for i in 1..v_qty loop
    if i = 1 then
      v_name := v_order.buyer_full_name;
      v_email := v_order.buyer_email;
      v_gender := v_meta ->> 'primaryBuyerGender';
    else
      v_attendee := v_attendees -> (i - 2);
      v_name := coalesce(nullif(trim(v_attendee ->> 'name'), ''), v_order.buyer_full_name);
      v_email := coalesce(nullif(trim(v_attendee ->> 'email'), ''), v_order.buyer_email);
      v_gender := v_attendee ->> 'gender';
    end if;

    if v_gender is not null and v_gender not in ('male', 'female', 'other', 'prefer-not-to-say') then
      v_gender := null;
    end if;

    insert into public.tickets (
      order_id, event_id, ticket_type_id, ticket_code, qr_code_url,
      attendee_name, attendee_email, gender, price, currency,
      validation_status, owner_user_id
    ) values (
      p_order_id, v_order.event_id, v_type.id, public.generate_short_ticket_code(), '',
      v_name, v_email, v_gender, v_unit_price, v_currency,
      'valid', v_order.buyer_user_id
    )
    returning id into v_ticket_id;

    v_ticket_ids := v_ticket_ids || v_ticket_id;
  end loop;

  update public.ticket_types set sold = sold + v_qty where id = v_type.id;

  update public.orders
  set status = 'paid',
      payment_provider = p_provider,
      payment_reference = coalesce(p_reference, payment_reference)
  where id = p_order_id;

  insert into public.payment_transactions (order_id, provider, provider_ref, status, amount, currency)
  values (p_order_id, p_provider, p_reference, 'success', coalesce(p_amount_paid, v_order.total_amount), v_currency);

  return jsonb_build_object(
    'status', 'fulfilled',
    'ticket_ids', to_jsonb(v_ticket_ids),
    'quantity', v_qty,
    'oversold', (v_type.sold + v_qty) > v_type.quantity
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- refund_order(order): order -> refunded, valid tickets -> refunded,
-- inventory released. Idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.refund_order(p_order_id uuid, p_reference text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_count int;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_order.status = 'refunded' then
    return jsonb_build_object('status', 'already_refunded');
  end if;

  with refunded as (
    update public.tickets
    set validation_status = 'refunded'
    where order_id = p_order_id and validation_status = 'valid'
    returning ticket_type_id
  ), counts as (
    select ticket_type_id, count(*)::int as n from refunded group by ticket_type_id
  ), released as (
    update public.ticket_types tt
    set sold = greatest(tt.sold - c.n, 0)
    from counts c
    where tt.id = c.ticket_type_id
    returning c.n
  )
  select coalesce(sum(n), 0) into v_count from released;

  update public.orders set status = 'refunded' where id = p_order_id;

  insert into public.payment_transactions (order_id, provider, provider_ref, status, amount, currency)
  values (p_order_id, coalesce(v_order.payment_provider, 'paystack'), coalesce(p_reference, v_order.payment_reference),
          'refunded', v_order.total_amount, coalesce(v_order.currency, 'NGN'));

  return jsonb_build_object('status', 'refunded', 'tickets_refunded', v_count);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.fulfil_order(uuid, text, text, numeric, text)',
    'public.refund_order(uuid, text)',
    'public.generate_short_ticket_code()',
    'public.log_unmatched_payment(uuid, text, text, numeric, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ticket emails / QR codes after fulfilment: claimed so they run once, and
-- re-run if the request that issued the tickets died before finishing
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists post_fulfilment_claimed_at timestamptz,
  add column if not exists post_fulfilment_done_at timestamptz;

-- Orders paid before this migration already had their emails sent
update public.orders
set post_fulfilment_done_at = coalesce(post_fulfilment_done_at, updated_at)
where status in ('paid', 'refunded') and post_fulfilment_done_at is null;

-- ---------------------------------------------------------------------------
-- Re-sync inventory with the tickets that exist (never lowers a count)
-- ---------------------------------------------------------------------------
update public.ticket_types tt
set sold = c.n
from (
  select t.ticket_type_id, count(*)::int as n
  from public.tickets t
  where t.validation_status not in ('refunded', 'revoked')
  group by t.ticket_type_id
) c
where tt.id = c.ticket_type_id
  and tt.sold < c.n;

commit;
