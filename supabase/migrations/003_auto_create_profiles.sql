-- Migration: Auto-create profiles when users sign up
-- This ensures every authenticated user has a corresponding profile row

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert a new profile row for the newly created user
  insert into public.profiles (user_id, full_name, phone)
  values (
    new.id,
    -- Extract full_name from user metadata if available
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName'),
    -- Extract phone from user metadata if available
    coalesce(new.raw_user_meta_data->>'phone', null)
  )
  on conflict (user_id) do nothing; -- Prevent duplicate if somehow triggered twice
  return new;
end;
$$;

-- Create trigger on auth.users to automatically create profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

