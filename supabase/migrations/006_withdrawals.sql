-- Withdrawals: table, enum, and RLS
do $$ begin
  create type public.withdrawal_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  status public.withdrawal_status not null default 'pending',
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.withdrawal_requests enable row level security;

-- Policies: users can insert/select their own rows
drop policy if exists "withdrawals_insert_own" on public.withdrawal_requests;
create policy "withdrawals_insert_own" on public.withdrawal_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "withdrawals_select_own" on public.withdrawal_requests;
create policy "withdrawals_select_own" on public.withdrawal_requests
  for select to authenticated
  using (auth.uid() = user_id);

-- Admins can select/update all rows
-- Assumes profiles.is_admin boolean exists
drop policy if exists "withdrawals_admin_select" on public.withdrawal_requests;
create policy "withdrawals_admin_select" on public.withdrawal_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and coalesce((p).is_admin, false) = true
    )
  );

drop policy if exists "withdrawals_admin_update" on public.withdrawal_requests;
create policy "withdrawals_admin_update" on public.withdrawal_requests
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and coalesce((p).is_admin, false) = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and coalesce((p).is_admin, false) = true
    )
  );


