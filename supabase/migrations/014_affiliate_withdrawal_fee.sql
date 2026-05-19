-- Add metadata for source-based withdrawals and fee tracking

alter table public.withdrawal_requests
  add column if not exists source text;

update public.withdrawal_requests
set source = 'combined'
where source is null;

alter table public.withdrawal_requests
  alter column source set default 'combined';

alter table public.withdrawal_requests
  alter column source set not null;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_source_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_source_check
      check (source in ('combined', 'affiliate', 'event'));
  end if;
end $$;

alter table public.withdrawal_requests
  add column if not exists fee_amount numeric(12,2);

alter table public.withdrawal_requests
  add column if not exists net_amount numeric(12,2);

update public.withdrawal_requests
set
  fee_amount = coalesce(fee_amount, 0),
  net_amount = coalesce(net_amount, amount)
where fee_amount is null
   or net_amount is null;

alter table public.withdrawal_requests
  alter column fee_amount set default 0,
  alter column fee_amount set not null,
  alter column net_amount set default 0,
  alter column net_amount set not null;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_fee_amount_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_fee_amount_check
      check (fee_amount >= 0);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_net_amount_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_net_amount_check
      check (net_amount >= 0 and net_amount <= amount);
  end if;
end $$;
