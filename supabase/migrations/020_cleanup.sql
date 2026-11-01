-- Migration 020: cleanup (additive, safe to run BEFORE deploying the new app)
--
--   1. events.published_email_sent_at: the "your event is live" email is sent
--      once per event (claimed atomically by /api/emails/event-published).
--   2. send_abandoned_cart_emails(): pg_net's http_post returns a request id,
--      not a response, and the endpoint requires the internal secret header.
--      To use it, store the secret once:
--        insert into public.config (key, value) values ('internal_api_secret', '<INTERNAL_API_SECRET>')
--        on conflict (key) do update set value = excluded.value;
--      (Inngest already sends abandoned-cart emails per order; this cron path is optional.)
--
-- Safe to re-run.

begin;

alter table public.events
  add column if not exists published_email_sent_at timestamptz;

-- Existing events have already had (or missed) their email
update public.events
set published_email_sent_at = coalesce(published_email_sent_at, created_at)
where published_email_sent_at is null;

create or replace function public.send_abandoned_cart_emails()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select value into v_url from public.config where key = 'abandoned_cart_api_url';
  select value into v_secret from public.config where key = 'internal_api_secret';

  if v_url is null or v_secret is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Set abandoned_cart_api_url and internal_api_secret in public.config'
    );
  end if;

  -- Asynchronous: the response lands in net._http_response
  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := jsonb_build_object('minutes', 5, 'limit', 50)
  ) into v_request_id;

  return jsonb_build_object('success', true, 'request_id', v_request_id);
exception
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

revoke execute on function public.send_abandoned_cart_emails() from public, anon, authenticated;
grant execute on function public.send_abandoned_cart_emails() to service_role;

commit;
