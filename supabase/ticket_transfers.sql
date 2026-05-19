-- ============================================================
-- Ticket Transfer Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Add owner tracking to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- 2. Backfill owner_user_id from the original order's buyer
UPDATE tickets t
SET owner_user_id = o.buyer_user_id
FROM orders o
WHERE t.order_id = o.id
  AND t.owner_user_id IS NULL;

-- 3. Ticket transfer history
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own transfers"
  ON ticket_transfers FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- 4. Allow users to read tickets they now own (received via transfer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tickets' AND policyname = 'Ticket owners can read their tickets'
  ) THEN
    CREATE POLICY "Ticket owners can read their tickets"
      ON tickets FOR SELECT
      USING (owner_user_id = auth.uid());
  END IF;
END$$;

-- 5. RPC to look up a user + their name by email (called from the transfer API)
CREATE OR REPLACE FUNCTION get_user_info_by_email(p_email TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT) AS $$
  SELECT au.id, p.full_name, au.email
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE lower(au.email) = lower(p_email)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
