-- 015_backfill_locations_from_events.sql
--
-- One-time backfill: extract unique venues from existing events and add them
-- to the locations table as pending (is_active = false) for admin review.
--
-- Conditions for inclusion:
--   - Physical event (is_virtual = false)
--   - Location not undisclosed
--   - No platform location already linked (location_id IS NULL)
--   - Has a venue name, city, and country
--   - Not already present in the locations table (deduplicated by name+city+country)
--
-- For duplicate venues, we take the earliest event's user_id as the owner.

INSERT INTO public.locations (
  user_id,
  name,
  address,
  city,
  country,
  latitude,
  longitude,
  is_active
)
SELECT DISTINCT ON (lower(trim(e.venue)), lower(trim(e.city)), lower(trim(e.country)))
  e.user_id,
  trim(e.venue)    AS name,
  e.address,
  e.city,
  e.country,
  e.latitude,
  e.longitude,
  false            AS is_active
FROM public.events e
WHERE
  e.is_virtual = false
  AND e.location_visibility NOT IN ('undisclosed')
  AND e.location_id IS NULL
  AND e.venue IS NOT NULL AND trim(e.venue) <> ''
  AND e.city IS NOT NULL  AND trim(e.city)  <> ''
  AND e.country IS NOT NULL AND trim(e.country) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.locations l
    WHERE lower(trim(l.name))    = lower(trim(e.venue))
      AND lower(trim(l.city))    = lower(trim(e.city))
      AND lower(trim(l.country)) = lower(trim(e.country))
  )
ORDER BY
  lower(trim(e.venue)),
  lower(trim(e.city)),
  lower(trim(e.country)),
  e.created_at ASC;
