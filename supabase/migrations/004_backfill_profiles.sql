-- Migration: Backfill profiles for existing authenticated users who don't have profiles
-- This should be run once to create profiles for users who signed up before the trigger was added

-- Create profiles for all authenticated users who don't have one yet
insert into public.profiles (user_id, full_name, phone)
select 
  au.id,
  coalesce(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'fullName',
    split_part(au.email, '@', 1) -- Fallback to email username if no name
  ) as full_name,
  coalesce(
    au.raw_user_meta_data->>'phone',
    null
  ) as phone
from auth.users au
left join public.profiles p on p.user_id = au.id
where p.user_id is null -- Only users without existing profiles
on conflict (user_id) do nothing;

