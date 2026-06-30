-- 016_event_organizer_report.sql
--
-- Tracks whether the post-event "your event has ended" report email has
-- been sent to the organizer, so the Inngest cron job that scans for
-- recently-ended events doesn't send duplicates.

alter table public.events
  add column if not exists organizer_report_sent_at timestamptz;

-- Backfill: events that already ended before this migration ran should not
-- suddenly trigger a recap email once the cron job picks them up.
update public.events
set organizer_report_sent_at = now()
where end_time is not null
  and end_time < now()
  and organizer_report_sent_at is null;

create index if not exists idx_events_end_time_report
  on public.events (end_time)
  where organizer_report_sent_at is null;
