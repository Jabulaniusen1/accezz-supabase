-- ============================================================
-- Affiliate Feature Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Affiliate settings per event (controlled by event creator)
create table if not exists affiliate_settings (
  id uuid default gen_random_uuid() primary key,
  event_id uuid not null references events(id) on delete cascade,
  enabled boolean not null default false,
  commission_type text not null default 'percentage'
    check (commission_type in ('percentage', 'fixed')),
  commission_value numeric(10,2) not null default 10,
  created_at timestamptz not null default now(),
  unique(event_id)
);

-- 2. Affiliate registrations (user enrolled as affiliate for an event)
create table if not exists affiliates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  affiliate_code text not null,
  clicks integer not null default 0,
  conversions integer not null default 0,
  total_earned numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(affiliate_code),
  unique(user_id, event_id)
);

-- 3. Commission records — one per order that came through an affiliate
create table if not exists affiliate_commissions (
  id uuid default gen_random_uuid() primary key,
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  unique(order_id)
);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table affiliate_settings enable row level security;
alter table affiliates enable row level security;
alter table affiliate_commissions enable row level security;

-- affiliate_settings: public read, event owner writes
create policy "Anyone can read affiliate settings"
  on affiliate_settings for select using (true);

create policy "Event owner manages affiliate settings"
  on affiliate_settings for all
  using (event_id in (select id from events where user_id = auth.uid()));

-- affiliates: public read, user manages their own rows
create policy "Anyone can read affiliates"
  on affiliates for select using (true);

create policy "Users manage their own affiliate rows"
  on affiliates for all using (user_id = auth.uid());

-- affiliate_commissions: users read their own
create policy "Users read own commissions"
  on affiliate_commissions for select using (user_id = auth.uid());

-- ============================================================
-- Helper function to atomically update affiliate stats
-- ============================================================

create or replace function increment_affiliate_stats(
  p_affiliate_id uuid,
  p_commission numeric
) returns void as $$
begin
  update affiliates
  set
    conversions  = conversions  + 1,
    total_earned = total_earned + p_commission
  where id = p_affiliate_id;
end;
$$ language plpgsql security definer;
