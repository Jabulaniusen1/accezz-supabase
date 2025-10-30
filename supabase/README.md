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
- ticket-qr (restricted/private)

Set storage policies to allow:
- Public read on event images/gallery
- Owner-only write for their event folders (prefix: events/{event_id}/...)
- Owners and buyers can read `ticket-qr` for their tickets; writes by service role

## Post-setup

- Use `issue_tickets_and_update_inventory(order_id)` after marking an order as `paid`.
- Insert into `event_views` from the frontend to track views.
- Use `ticket_scans` to audit validations at the door.

