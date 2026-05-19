-- ============================================================
-- Saved / Bookmarked Events
-- Run this in your Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved events"
  ON saved_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can save events"
  ON saved_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave events"
  ON saved_events FOR DELETE
  USING (user_id = auth.uid());
