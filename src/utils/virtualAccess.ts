import type { SupabaseClient } from '@supabase/supabase-js';

export type VirtualAccessDetails = { meetingUrl?: string; meetingId?: string };

/**
 * Meeting URL / ID for a virtual event. They live in `event_virtual_access`
 * (migration 019), which only the organizer, admins and ticket holders can
 * read; `events.virtual_details` only keeps the public platform name.
 *
 * Works with the browser client (RLS decides) and the service-role client.
 */
export async function fetchVirtualAccess(
  client: SupabaseClient,
  eventId: string
): Promise<VirtualAccessDetails | null> {
  const { data } = await client
    .from('event_virtual_access')
    .select('details')
    .eq('event_id', eventId)
    .maybeSingle();
  return (data?.details as VirtualAccessDetails | undefined) ?? null;
}

/** Public virtual_details merged with the private meeting details. */
export async function withVirtualAccess<T extends Record<string, unknown> | null | undefined>(
  client: SupabaseClient,
  eventId: string,
  publicDetails: T
): Promise<Record<string, unknown> | null> {
  const access = await fetchVirtualAccess(client, eventId);
  if (!publicDetails && !access) return null;
  return { ...(publicDetails || {}), ...(access || {}) };
}
