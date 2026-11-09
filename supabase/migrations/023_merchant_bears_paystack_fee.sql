-- Migration 023: merchant bears the Paystack processing fee
--
-- Buyers no longer pay the Paystack processing fee. The merchant (organizer)
-- bears it out of their payout.
--
-- Safe to re-run.

begin;

-- ---------------------------------------------------------------------------
-- 1) Column comments: processing_fee is now borne by the merchant
-- ---------------------------------------------------------------------------
comment on column public.orders.processing_fee
  is 'Always 0: the Paystack processing fee is borne by the merchant, not the buyer';
comment on column public.orders.amount_due
  is 'What the buyer is charged: total_amount + service_fee (processing_fee no longer added)';

-- ---------------------------------------------------------------------------
-- 2) fulfil_order: amount due no longer includes the buyer-paid processing fee
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
  v_due numeric;
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
  -- Buyer pays ticket subtotal + service fee only; Paystack fee is borne by merchant
  v_due := v_order.total_amount + v_order.service_fee;

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
    if v_due <> 0 or v_unit_price <> 0 then
      return jsonb_build_object('status', 'not_free');
    end if;
    if v_type.quantity - v_type.sold < v_qty then
      update public.orders set status = 'cancelled' where id = p_order_id;
      return jsonb_build_object('status', 'sold_out', 'available', greatest(v_type.quantity - v_type.sold, 0));
    end if;
  elsif p_provider = 'admin' then
    null;
  else
    if p_amount_paid is null
       or p_amount_paid < v_due
       or upper(coalesce(p_currency, '')) <> v_currency
       or (coalesce(v_meta ->> 'pricedBy', '') <> 'server' and v_order.total_amount < v_type.price * v_qty)
    then
      update public.orders
      set status = 'failed',
          meta = v_meta || jsonb_build_object('paymentIssue', jsonb_build_object(
            'reason', 'amount_mismatch',
            'expected', greatest(v_due, v_type.price * v_qty),
            'paid', p_amount_paid,
            'currency', p_currency,
            'reference', p_reference,
            'at', now()))
      where id = p_order_id;
      perform public.log_unmatched_payment(p_order_id, p_provider, p_reference, p_amount_paid, p_currency, 'amount_mismatch');
      return jsonb_build_object('status', 'amount_mismatch',
        'expected', v_due, 'paid', p_amount_paid, 'currency', p_currency);
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
  values (p_order_id, p_provider, p_reference, 'success', coalesce(p_amount_paid, v_due), v_currency);

  return jsonb_build_object(
    'status', 'fulfilled',
    'ticket_ids', to_jsonb(v_ticket_ids),
    'quantity', v_qty,
    'oversold', (v_type.sold + v_qty) > v_type.quantity
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) refund_order: refund amount no longer includes the buyer-paid processing fee
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
          'refunded', v_order.total_amount + v_order.service_fee,
          coalesce(v_order.currency, 'NGN'));

  return jsonb_build_object('status', 'refunded', 'tickets_refunded', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) get_withdrawable_balance: deduct the Paystack fee the merchant bears
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
  v_platform_fee numeric := 0;
  v_paystack_fee numeric := 0;
  v_commissions_owed numeric := 0;
  v_affiliate_earned numeric := 0;
  v_withdrawn numeric := 0;
  v_pending int := 0;
  v_available numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if auth.uid() is not null and v_user <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select coalesce(user_type, 'customer') into v_user_type from public.profiles where user_id = v_user;

  -- Ticket sales collected for the user's events (refunded and complimentary
  -- orders excluded; buyer fees are not part of the sale). The Accezz platform
  -- fee and the Paystack processing fee (borne by the merchant) are deducted.
  select coalesce(sum(s.sales), 0),
         coalesce(sum(round(s.sales * public.platform_fee_rate(s.sales), 2)), 0),
         coalesce(sum(s.paystack_fee), 0)
  into v_event_revenue, v_platform_fee, v_paystack_fee
  from (
    select
      sum(o.total_amount) as sales,
      sum(
        least(
          case when o.total_amount >= 2500 then o.total_amount * 0.015 + 100 else o.total_amount * 0.015 end,
          2000
        )
      ) as paystack_fee
    from public.orders o
    join public.events e on e.id = o.event_id
    where e.user_id = v_user and o.status = 'paid'
    group by o.event_id
  ) s;

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
    v_available := v_event_revenue - v_platform_fee - v_paystack_fee - v_commissions_owed - v_withdrawn;
  else
    v_available := v_affiliate_earned - v_withdrawn;
  end if;

  return jsonb_build_object(
    'user_type', v_user_type,
    'event_revenue', v_event_revenue,
    'platform_fee', v_platform_fee,
    'paystack_fee', v_paystack_fee,
    'affiliate_commissions_owed', v_commissions_owed,
    'affiliate_earned', v_affiliate_earned,
    'withdrawn', v_withdrawn,
    'pending_requests', v_pending,
    'available', greatest(v_available, 0),
    'raw_available', v_available
  );
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.fulfil_order(uuid, text, text, numeric, text)',
    'public.refund_order(uuid, text)',
    'public.get_withdrawable_balance(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

commit;
