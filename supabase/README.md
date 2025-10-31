# Supabase schema for Accezz

## Apply schema

Run this file in Supabase SQL editor or via CLI:

```sql
-- schema
\i supabase/schema.sql
```

## Storage (buckets)

Create buckets in Supabase Storage:
- event-images (public read)
- event-gallery (public read)
- ticket-qr (public read - QR codes need to be accessible for scanning)

**Important**: Create the `ticket-qr` bucket in Supabase Storage dashboard:
1. Go to Storage in Supabase dashboard
2. Create new bucket named `ticket-qr`
3. Set bucket to **public** (allows public read access for QR codes)
4. The storage policies are already defined in `schema.sql`:
   - Public read access for scanning
   - Insert allowed for ticket creation
   - Update/delete allowed for maintenance

Set storage policies to allow:
- Public read on event images/gallery
- Owner-only write for their event folders (prefix: events/{event_id}/...)
- Public read on `ticket-qr` for QR code scanning; insert allowed for ticket creation

## Post-setup

- Use `issue_tickets_and_update_inventory(order_id)` after marking an order as `paid`.
- Insert into `event_views` from the frontend to track views.
- Use `ticket_scans` to audit validations at the door.

