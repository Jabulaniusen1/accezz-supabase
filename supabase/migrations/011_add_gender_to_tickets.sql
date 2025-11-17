-- Migration: Add gender column to tickets table
-- This migration adds a gender field to store attendee gender information

-- Add gender column to tickets table
alter table public.tickets
  add column if not exists gender text;

-- Add check constraint to ensure valid gender values
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_gender_check'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
      add constraint tickets_gender_check
      check (gender is null or gender in ('male', 'female', 'other', 'prefer-not-to-say'));
  end if;
end $$;

-- Add comment to the column
comment on column public.tickets.gender is 'Gender of the ticket holder: male, female, other, or prefer-not-to-say';



