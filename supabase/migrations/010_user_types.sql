-- Migration: Add user_type to profiles table
-- All existing users are creators by default

-- Add user_type column to profiles
alter table public.profiles
  add column if not exists user_type text not null default 'creator';

-- Add city column to profiles if it doesn't exist
alter table public.profiles
  add column if not exists city text;

-- Add check constraint to ensure valid user types
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_user_type_check
      check (user_type in ('creator', 'customer'));
  end if;
end $$;

-- Set all existing users to 'creator' (they already are by default, but explicit update for clarity)
update public.profiles
set user_type = 'creator'
where user_type is null or user_type = '';

-- Update the handle_new_user function to accept user_type from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_type text;
begin
  -- Extract user_type from user metadata, default to 'customer' if not specified
  v_user_type := coalesce(
    new.raw_user_meta_data->>'user_type',
    'customer'  -- Default new signups to customer unless specified as creator
  );
  
  -- Ensure valid user_type
  if v_user_type not in ('creator', 'customer') then
    v_user_type := 'customer';
  end if;

  -- Insert a new profile row for the newly created user
  insert into public.profiles (user_id, full_name, phone, user_type, country, city)
  values (
    new.id,
    -- Extract full_name from user metadata if available
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName'),
    -- Extract phone from user metadata if available
    coalesce(new.raw_user_meta_data->>'phone', null),
    v_user_type,
    -- Extract country and city from user metadata if available
    coalesce(new.raw_user_meta_data->>'country', null),
    coalesce(new.raw_user_meta_data->>'city', null)
  )
  on conflict (user_id) do nothing; -- Prevent duplicate if somehow triggered twice
  return new;
end;
$$;

