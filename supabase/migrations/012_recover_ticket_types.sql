-- Migration: Recover deleted ticket_types and restore analytics relationships
-- This script attempts to recover ticket_types that were deleted when ticket prices were updated
-- It reconstructs ticket_types from existing tickets and orders data

-- IMPORTANT: Run this in Supabase SQL Editor
-- This script will help recover lost analytics data

-- Step 1: Check current state
DO $$
DECLARE
  total_tickets INTEGER;
  orphaned_tickets_count INTEGER;
  total_orders INTEGER;
  orders_without_tickets INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tickets FROM public.tickets;
  SELECT COUNT(*) INTO orphaned_tickets_count
  FROM public.tickets t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ticket_types tt WHERE tt.id = t.ticket_type_id
  );
  SELECT COUNT(*) INTO total_orders FROM public.orders WHERE status = 'paid';
  SELECT COUNT(*) INTO orders_without_tickets
  FROM public.orders o
  WHERE o.status = 'paid' AND NOT EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.order_id = o.id
  );
  
  RAISE NOTICE '=== RECOVERY STATUS ===';
  RAISE NOTICE 'Total tickets: %', total_tickets;
  RAISE NOTICE 'Orphaned tickets (missing ticket_type): %', orphaned_tickets_count;
  RAISE NOTICE 'Paid orders: %', total_orders;
  RAISE NOTICE 'Orders without tickets (possible cascade delete): %', orders_without_tickets;
  
  IF orphaned_tickets_count > 0 THEN
    RAISE NOTICE '✓ Tickets exist but ticket_types are missing - CAN RECOVER';
  ELSIF orders_without_tickets > 0 THEN
    RAISE NOTICE '⚠ Tickets were cascade deleted - LIMITED RECOVERY from orders';
  ELSE
    RAISE NOTICE '✓ No data loss detected';
  END IF;
END $$;

-- Step 2: Reconstruct ticket_types from tickets data (if tickets still exist)
-- This creates ticket_types based on the ticket data we have
-- We'll use the original ticket_type_id and reconstruct from ticket data

CREATE TEMP TABLE IF NOT EXISTS recovered_ticket_types AS
SELECT 
  t.event_id,
  t.ticket_type_id as original_id,
  -- We'll generate a name based on price and currency in the INSERT statement
  NULL::text as inferred_name,
  AVG(t.price::numeric) as price,  -- Use average price if multiple prices exist
  (SELECT currency FROM public.tickets 
   WHERE ticket_type_id = t.ticket_type_id AND currency IS NOT NULL 
   GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1) as currency,  -- Most common currency
  COUNT(*) as sold_count,
  MIN(t.created_at) as first_sale_date,
  MAX(t.created_at) as last_sale_date
FROM public.tickets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.ticket_types tt WHERE tt.id = t.ticket_type_id
)
GROUP BY t.event_id, t.ticket_type_id;

-- Step 3: Recreate missing ticket_types from ticket data
-- This preserves the original ticket_type_id to restore the relationship
-- IMPORTANT: This will restore analytics by recreating the missing ticket_type records
INSERT INTO public.ticket_types (id, event_id, name, price, quantity, sold, details, created_at, updated_at)
SELECT 
  rtt.original_id,  -- CRITICAL: Use original ID to restore ticket relationships
  rtt.event_id,
  CASE 
    WHEN rtt.price > 0 THEN rtt.currency || ' ' || rtt.price::text || ' (Recovered)'
    ELSE 'Free Ticket (Recovered)'
  END as inferred_name,
  rtt.price,
  GREATEST(rtt.sold_count + 10, 100) as quantity,  -- Set quantity to sold + buffer (min 100)
  rtt.sold_count as sold,
  jsonb_build_object(
    'recovered', true,
    'recovery_date', NOW(),
    'original_price', rtt.price,
    'first_sale', rtt.first_sale_date,
    'last_sale', rtt.last_sale_date,
    'currency', rtt.currency
  ) as details,
  rtt.first_sale_date as created_at,
  NOW() as updated_at
FROM recovered_ticket_types rtt
WHERE NOT EXISTS (
  SELECT 1 FROM public.ticket_types tt WHERE tt.id = rtt.original_id
)
ON CONFLICT (id) DO UPDATE SET
  sold = GREATEST(ticket_types.sold, EXCLUDED.sold),
  updated_at = NOW(),
  -- Update name if it was changed to a generic name
  name = CASE 
    WHEN ticket_types.name LIKE '%(Recovered)' THEN ticket_types.name
    ELSE EXCLUDED.name
  END;

-- Report recovery results
DO $$
DECLARE
  recovered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recovered_count FROM recovered_ticket_types;
  IF recovered_count > 0 THEN
    RAISE NOTICE '✓ Recovered % ticket_types from existing tickets', recovered_count;
  END IF;
END $$;

-- Step 4: Alternative recovery - if tickets were cascade deleted, try to recover from orders
-- This creates ticket_types based on order items (if that data exists)
-- Note: This is a fallback if tickets were deleted

-- Check if we can recover from orders table
DO $$
DECLARE
  recoverable_orders_count INTEGER;
BEGIN
  -- Check orders that might have ticket data in meta
  SELECT COUNT(*) INTO recoverable_orders_count
  FROM public.orders o
  WHERE o.status = 'paid'
    AND o.meta IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.order_id = o.id
    );
  
  IF recoverable_orders_count > 0 THEN
    RAISE NOTICE 'Found % paid orders without tickets - tickets may have been cascade deleted', recoverable_orders_count;
    RAISE NOTICE 'Manual recovery may be needed from order metadata';
  END IF;
END $$;

-- Step 5: Create a view to help identify what data is recoverable
CREATE OR REPLACE VIEW public.recovery_status AS
SELECT 
  e.id as event_id,
  e.title as event_title,
  COUNT(DISTINCT tt.id) as current_ticket_types,
  COUNT(DISTINCT t.id) as current_tickets,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'paid') as paid_orders,
  COUNT(DISTINCT t.ticket_type_id) FILTER (
    WHERE NOT EXISTS (SELECT 1 FROM public.ticket_types WHERE id = t.ticket_type_id)
  ) as orphaned_ticket_type_ids
FROM public.events e
LEFT JOIN public.ticket_types tt ON tt.event_id = e.id
LEFT JOIN public.tickets t ON t.event_id = e.id
LEFT JOIN public.orders o ON o.event_id = e.id
GROUP BY e.id, e.title;

-- Display recovery status
SELECT * FROM public.recovery_status
WHERE orphaned_ticket_type_ids > 0 OR current_tickets > current_ticket_types
ORDER BY orphaned_ticket_type_ids DESC, current_tickets DESC;

-- Cleanup temp table
DROP TABLE IF EXISTS recovered_ticket_types;

