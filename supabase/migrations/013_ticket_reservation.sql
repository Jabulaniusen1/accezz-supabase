-- Migration: Add ticket reservation system with atomic operations
-- This migration adds reservation support to prevent race conditions and overselling

-- Step 1: Add reserved column to ticket_types
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS reserved int NOT NULL DEFAULT 0 CHECK (reserved >= 0);

-- Step 2: Add check constraint to ensure sold + reserved <= quantity
-- Drop existing constraint if it exists (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_types_sold_reserved_quantity_check'
  ) THEN
    ALTER TABLE public.ticket_types 
    DROP CONSTRAINT ticket_types_sold_reserved_quantity_check;
  END IF;
END $$;

ALTER TABLE public.ticket_types
ADD CONSTRAINT ticket_types_sold_reserved_quantity_check 
CHECK (sold + reserved <= quantity);

-- Step 3: Add expires_at column to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Step 4: Create index on expires_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_orders_expires_at_status 
ON public.orders(expires_at, status) 
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Step 5: Atomic reservation function
-- This function atomically reserves tickets using row-level locking
CREATE OR REPLACE FUNCTION public.reserve_tickets_atomic(
  p_event_id uuid,
  p_ticket_type_name text,
  p_quantity int,
  p_order_id uuid,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_type_id uuid;
  v_available int;
  v_reserved int;
  v_result jsonb;
BEGIN
  -- Lock the ticket type row to prevent concurrent modifications
  SELECT id, (quantity - sold - reserved) as available, reserved
  INTO v_ticket_type_id, v_available, v_reserved
  FROM public.ticket_types
  WHERE event_id = p_event_id
    AND name = p_ticket_type_name
  FOR UPDATE; -- Row-level lock

  -- Check if ticket type exists
  IF v_ticket_type_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket type not found'
    );
  END IF;

  -- Check if enough tickets are available
  IF v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Only %s ticket(s) available', v_available),
      'available', v_available
    );
  END IF;

  -- Atomically increment reserved count
  UPDATE public.ticket_types
  SET reserved = reserved + p_quantity,
      updated_at = now()
  WHERE id = v_ticket_type_id;

  -- Update order with expires_at
  UPDATE public.orders
  SET expires_at = p_expires_at,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_type_id', v_ticket_type_id,
    'reserved', v_reserved + p_quantity,
    'available', v_available - p_quantity
  );
END;
$$;

-- Step 6: Function to move reserved tickets to sold (on payment success)
CREATE OR REPLACE FUNCTION public.move_reserved_to_sold(
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_ticket_type_id uuid;
  v_quantity int;
  v_result jsonb;
BEGIN
  -- Fetch order with ticket type info from meta
  SELECT 
    o.id,
    o.event_id,
    o.meta->>'ticketTypeName' as ticket_type_name,
    (o.meta->>'quantity')::int as quantity
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.status = 'paid'; -- Only process paid orders

  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found or not paid'
    );
  END IF;

  -- Get ticket type ID
  SELECT id INTO v_ticket_type_id
  FROM public.ticket_types
  WHERE event_id = v_order.event_id
    AND name = v_order.ticket_type_name;

  IF v_ticket_type_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket type not found'
    );
  END IF;

  v_quantity := COALESCE(v_order.quantity, 1);

  -- Atomically move reserved to sold
  UPDATE public.ticket_types
  SET 
    reserved = GREATEST(0, reserved - v_quantity), -- Prevent negative
    sold = sold + v_quantity,
    updated_at = now()
  WHERE id = v_ticket_type_id
    AND reserved >= v_quantity; -- Ensure we have enough reserved

  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient reserved tickets (possible race condition)'
    );
  END IF;

  -- Clear expires_at since order is now paid
  UPDATE public.orders
  SET expires_at = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_type_id', v_ticket_type_id,
    'quantity_moved', v_quantity
  );
END;
$$;

-- Step 7: Function to release expired reservations
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_order record;
  v_released_count int := 0;
  v_orders_updated int := 0;
  v_result jsonb;
BEGIN
  -- Find expired pending orders
  FOR v_expired_order IN
    SELECT 
      o.id,
      o.event_id,
      o.meta->>'ticketTypeName' as ticket_type_name,
      (o.meta->>'quantity')::int as quantity
    FROM public.orders o
    WHERE o.status = 'pending'
      AND o.expires_at IS NOT NULL
      AND o.expires_at < now()
    FOR UPDATE -- Lock rows to prevent concurrent processing
  LOOP
    -- Get ticket type ID
    DECLARE
      v_ticket_type_id uuid;
      v_quantity int;
    BEGIN
      SELECT id INTO v_ticket_type_id
      FROM public.ticket_types
      WHERE event_id = v_expired_order.event_id
        AND name = v_expired_order.ticket_type_name;

      IF v_ticket_type_id IS NOT NULL THEN
        v_quantity := COALESCE(v_expired_order.quantity, 1);

        -- Release reserved tickets back to inventory
        UPDATE public.ticket_types
        SET 
          reserved = GREATEST(0, reserved - v_quantity),
          updated_at = now()
        WHERE id = v_ticket_type_id
          AND reserved >= v_quantity;

        IF FOUND THEN
          v_released_count := v_released_count + v_quantity;
        END IF;
      END IF;
    END;

    -- Mark order as cancelled
    UPDATE public.orders
    SET 
      status = 'cancelled',
      expires_at = NULL,
      updated_at = now()
    WHERE id = v_expired_order.id;

    IF FOUND THEN
      v_orders_updated := v_orders_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'orders_cancelled', v_orders_updated,
    'tickets_released', v_released_count,
    'timestamp', now()
  );
END;
$$;

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reserve_tickets_atomic(uuid, text, int, uuid, timestamptz) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.move_reserved_to_sold(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO authenticated, anon;

-- Step 9: Add comment for documentation
COMMENT ON FUNCTION public.reserve_tickets_atomic IS 
'Atomically reserves tickets for an order. Uses row-level locking to prevent race conditions. Returns success status and updated counts.';

COMMENT ON FUNCTION public.move_reserved_to_sold IS 
'Moves reserved tickets to sold when payment succeeds. Must be called after order status is set to paid.';

COMMENT ON FUNCTION public.release_expired_reservations IS 
'Releases expired pending order reservations back to inventory. Should be called periodically via cron job.';

-- Step 10: Initialize reserved column for existing ticket_types (set to 0)
UPDATE public.ticket_types
SET reserved = 0
WHERE reserved IS NULL;

-- Step 11: Schedule cleanup cron job (optional - can be done via Supabase Dashboard or Vercel Cron)
-- Option A: Supabase pg_cron (recommended if available)
-- Go to Supabase Dashboard > Database > Cron Jobs > New Cron Job
-- Schedule: */2 * * * * (every 2 minutes)
-- Command: SELECT public.release_expired_reservations();
--
-- Or run this SQL manually (if cron.schedule is available):
-- SELECT cron.schedule(
--   'release-expired-reservations',
--   '*/2 * * * *', -- Every 2 minutes
--   'SELECT public.release_expired_reservations();'
-- );
--
-- Option B: Vercel Cron (if deployed on Vercel)
-- Create vercel.json in project root:
-- {
--   "crons": [{
--     "path": "/api/cron/cleanup-expired-orders",
--     "schedule": "*/2 * * * *"
--   }]
-- }
--
-- Option C: External cron service
-- Call: GET https://yourdomain.com/api/cron/cleanup-expired-orders
-- With optional Authorization header: Bearer YOUR_CRON_SECRET

