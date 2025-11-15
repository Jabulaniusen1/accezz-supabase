-- Migration: Set up cron job for abandoned cart emails
-- This creates a scheduled job that runs every 5 minutes to send abandoned cart emails

-- Create a config table to store the API URL (for easier configuration)
create table if not exists public.config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

-- Insert default API URL (UPDATE THIS WITH YOUR ACTUAL DOMAIN)
-- Replace 'https://www.accezzlive.com' with your actual domain
insert into public.config (key, value, description)
values (
  'abandoned_cart_api_url',
  'https://www.accezzlive.com/api/emails/send-abandoned-carts',
  'API endpoint URL for sending abandoned cart emails'
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

-- Grant select on config table to authenticated users (if needed)
grant select on public.config to authenticated;

-- Create a function that calls the abandoned cart API endpoint
-- This function uses pg_net extension (available in Supabase) to make HTTP requests
create or replace function public.send_abandoned_cart_emails()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  api_url text;
  response_result record;
  base_url text;
begin
  -- Get the API URL from config table
  select value into api_url
  from public.config
  where key = 'abandoned_cart_api_url'
  limit 1;

  -- Fallback to environment variable or default
  if api_url is null or api_url = 'https://www.accezzlive.com/api/emails/send-abandoned-carts' then
    -- Try to get from environment (Supabase allows setting custom config)
    begin
      base_url := current_setting('app.settings.base_url', true);
      if base_url is not null then
        api_url := base_url || '/api/emails/send-abandoned-carts';
      else
        raise exception 'Please update the abandoned_cart_api_url in the config table with your actual domain';
      end if;
    exception when others then
      raise exception 'Please update the abandoned_cart_api_url in the config table with your actual domain';
    end;
  end if;

  -- Make HTTP POST request to the API endpoint using pg_net
  -- Note: pg_net extension must be enabled in Supabase
  select * into response_result
  from net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'minutes', 5,
      'limit', 50
    )
  );

  -- Return the response
  return jsonb_build_object(
    'status', response_result.status,
    'success', response_result.status = 200,
    'response', response_result.content
  );
exception
  when others then
    -- If pg_net is not available, return error
    return jsonb_build_object(
      'status', 500,
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to send abandoned cart emails. Make sure pg_net extension is enabled.'
    );
end;
$$;

-- Grant execute permission
grant execute on function public.send_abandoned_cart_emails() to postgres, service_role;

-- Add comment
comment on function public.send_abandoned_cart_emails() is 
  'Calls the abandoned cart email API endpoint to send emails for incomplete orders. Returns JSON with status and response.';

-- Enable pg_cron extension (if available and not already enabled)
-- Note: In Supabase, pg_cron is typically pre-enabled, but scheduling may require dashboard setup
do $$
begin
  -- Try to enable pg_cron (may fail if not available or already enabled)
  create extension if not exists pg_cron;
exception
  when others then
    -- Extension might not be available or already exists
    raise notice 'pg_cron extension setup: %', SQLERRM;
end;
$$;

-- Schedule the cron job to run every 5 minutes
-- IMPORTANT: You must schedule this manually via Supabase Dashboard
-- Go to Database > Cron Jobs > New Cron Job
-- Schedule: */5 * * * *
-- Command: SELECT public.send_abandoned_cart_emails();
--
-- Or run this SQL manually after the migration (if cron.schedule is available):
-- SELECT cron.schedule(
--   'send-abandoned-cart-emails',
--   '*/5 * * * *',
--   'SELECT public.send_abandoned_cart_emails();'
-- );

