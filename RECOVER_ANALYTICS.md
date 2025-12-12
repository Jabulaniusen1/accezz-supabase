# Recovering Deleted Analytics Records

## Problem
When ticket prices were edited, the update logic deleted all `ticket_types` and reinserted them with new IDs. This caused:
1. **Cascade deletion**: Tickets with `on delete cascade` may have been deleted
2. **Broken relationships**: Existing tickets lost their `ticket_type_id` references
3. **Missing analytics**: Analytics queries can't join tickets with ticket_types

## ✅ Automatic Recovery (Implemented)

The analytics page now **automatically displays tickets even when ticket_type records are missing**. The system will:
- Reconstruct ticket type names from ticket data (price, currency)
- Display tickets with labels like "USD 25.00 (Recovered)" or "Free Ticket (Recovered)"
- Show all analytics data even if ticket_types were deleted

**You don't need to run any recovery script** - the analytics will work automatically!

## Recovery Options

### Option 1: Check Supabase Backups (Recommended First Step)

Supabase provides automatic backups. Check if you can restore from a backup:

1. **Go to Supabase Dashboard** → Your Project → Database → Backups
2. **Check Point-in-Time Recovery** (if enabled)
3. **Restore to a point before the ticket update**

### Option 2: Run Recovery Script

If backups aren't available, run the recovery migration:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/012_recover_ticket_types.sql
```

This script will:
- Identify orphaned tickets (tickets with missing ticket_type references)
- Attempt to reconstruct ticket_types from existing ticket data
- Create a recovery status view to see what's recoverable

### Option 3: Manual Recovery from Orders

If tickets were cascade deleted, you may be able to recover from the `orders` table:

```sql
-- Check orders that have ticket data in metadata
SELECT 
  o.id,
  o.event_id,
  o.total_amount,
  o.meta,
  o.created_at
FROM public.orders o
WHERE o.status = 'paid'
  AND o.meta IS NOT NULL
ORDER BY o.created_at DESC;
```

The `meta` field might contain ticket type information that can be used to reconstruct the data.

### Option 4: Check Recovery Status

After running the recovery script, check what's recoverable:

```sql
SELECT * FROM public.recovery_status
WHERE orphaned_ticket_type_ids > 0 
   OR current_tickets > current_ticket_types
ORDER BY orphaned_ticket_type_ids DESC;
```

## Prevention & Recovery

### Prevention (Fixed)
The fix has been applied to `src/app/update/[eventId]/page.tsx`:
- ✅ Updates existing ticket_types instead of deleting/reinserting
- ✅ Preserves ticket_type IDs to maintain relationships
- ✅ Only deletes unused ticket_types (with no sales)

### Automatic Recovery (Implemented)
The analytics system now automatically handles missing ticket_types:
- ✅ Analytics page reconstructs ticket type names from ticket data
- ✅ Tickets are displayed even when ticket_type records are missing
- ✅ No manual recovery needed - works automatically

## Next Steps

1. **Check Supabase backups first** - This is the safest recovery method
2. **Run the recovery script** - If backups aren't available
3. **Verify recovery** - Check the `recovery_status` view
4. **Test analytics** - Ensure analytics are working after recovery

## Important Notes

- **If tickets were cascade deleted**, they cannot be fully recovered without a backup
- **Ticket type names** may need to be manually corrected after recovery
- **Quantities** will be set to `sold + 10` as a buffer
- **Historical accuracy** may be compromised if data was lost

## Contact Support

If recovery is not possible through these methods, contact Supabase support to check:
- Point-in-time recovery availability
- Database backup restoration options
- Transaction log recovery possibilities

