-- Payouts and withdrawals schema

do $$ begin
  alter table public.profiles add column if not exists paystack_recipient_code text;
exception when duplicate_column then null; end $$;

do $$ begin
  create type public.payout_status as enum ('pending','success','failed','reversed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  transfer_code text,
  reference text,
  recipient_code text,
  status public.payout_status not null default 'pending',
  reason text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payouts_updated_at on public.payouts;
create trigger trg_payouts_updated_at
before update on public.payouts
for each row execute function public.handle_updated_at();

alter table public.payouts enable row level security;

drop policy if exists "payouts_owner_rw" on public.payouts;
create policy "payouts_owner_rw" on public.payouts
for select using (auth.uid() = user_id);

drop policy if exists "payouts_owner_insert" on public.payouts;
create policy "payouts_owner_insert" on public.payouts
for insert with check (auth.uid() = user_id);

drop policy if exists "payouts_owner_update_status" on public.payouts;
create policy "payouts_owner_update_status" on public.payouts
for update using (auth.uid() = user_id);

-- Helper view for available balance per user: sum of paid orders for their events minus successful payouts
create or replace view public.user_available_balance as
select
  u.id as user_id,
  coalesce((
    select sum(o.total_amount)
    from public.orders o
    join public.events e on e.id = o.event_id
    where e.user_id = u.id and o.status = 'paid'
  ), 0)::numeric(12,2)
  - coalesce((
    select sum(p.amount)
    from public.payouts p
    where p.user_id = u.id and p.status in ('success','pending')
  ), 0)::numeric(12,2) as available_amount
from auth.users u;

-- Limited RLS via security definer function to fetch current user's available balance
create or replace function public.get_my_available_balance()
returns numeric(12,2)
language plpgsql
security definer
set search_path = public
as $$
declare
  amt numeric(12,2);
begin
  select coalesce(av.available_amount, 0)::numeric(12,2) into amt
  from public.user_available_balance av
  where av.user_id = auth.uid();
  return coalesce(amt, 0);
end;
$$;


