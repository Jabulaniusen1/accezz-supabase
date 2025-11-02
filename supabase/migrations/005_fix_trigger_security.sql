-- Fix trigger security to allow inventory checks when RLS is enabled
-- These triggers need SECURITY DEFINER to read ticket_types during ticket creation
--
-- Problem: When RLS is enabled, triggers execute with the caller's permissions.
-- This means when a non-owner tries to insert a ticket, the trigger cannot read
-- ticket_types due to RLS policies. By adding SECURITY DEFINER and setting
-- search_path, the functions run with elevated privileges while still maintaining
-- security through proper search_path isolation.

-- Fix the inventory check trigger
create or replace function public.ensure_inventory_available()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
declare
  available int;
begin
  select (quantity - sold) into available 
  from public.ticket_types 
  where id = new.ticket_type_id 
  for update;
  
  if available is null then
    raise exception 'Ticket type not found';
  end if;
  
  if available <= 0 then
    raise exception 'Ticket type is sold out';
  end if;
  
  return new;
end;
$$;

-- Fix the ticket event match trigger
create or replace function public.enforce_ticket_event_match()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Fix the inventory update function
create or replace function public.issue_tickets_and_update_inventory(p_order_id uuid)
returns void 
language plpgsql 
security definer
set search_path = public
as $$
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

-- Create a function to check if an order is paid (for use in RLS policies)
create or replace function public.is_order_paid(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists(
    select 1
    from public.orders
    where id = p_order_id
      and status = 'paid'
  );
end;
$$;

-- Fix tickets insert policy to use the SECURITY DEFINER function
drop policy if exists "tickets_insert_for_paid_orders" on public.tickets;
create policy "tickets_insert_for_paid_orders" on public.tickets
for insert with check (
  public.is_order_paid(order_id)
);

