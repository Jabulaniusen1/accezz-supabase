import { supabase } from './supabaseClient';
import { Event } from '@/types/event';

/**
 * Checks if an event is past (has finished)
 * An event is considered past if:
 * - end_time has passed (if it exists), OR
 * - start_time has passed (if no end_time)
 * @param event - The event to check
 * @returns true if the event is past, false otherwise
 */
export function isEventPast(event: Event): boolean {
  const now = new Date();
  
  // If end_time exists, check if it has passed
  if (event.endTime) {
    const endTime = new Date(event.endTime);
    return endTime < now;
  }
  
  // If no end_time, check if start_time has passed
  if (event.startTime) {
    const startTime = new Date(event.startTime);
    return startTime < now;
  }
  
  // Fallback to date if startTime is not available
  if (event.date) {
    const eventDate = new Date(event.date);
    return eventDate < now;
  }
  
  // If no time information, consider it not past
  return false;
}

/**
 * Fetches an event by slug from Supabase along with ticket types and gallery images
 * @param slug - The event slug
 * @returns Event object or null if not found
 */
export async function fetchEventBySlug(slug: string): Promise<Event | null> {
  try {
    // Fetch event by slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, category:event_categories(name, slug)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (eventError || !event) {
      return null;
    }

    // Fetch ticket types for the event
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true });

    if (ticketTypesError) {
      console.error('Error fetching ticket types:', ticketTypesError);
    }

    // Fetch gallery images for the event
    const { data: galleryImages, error: galleryError } = await supabase
      .from('event_gallery')
      .select('image_url')
      .eq('event_id', event.id)
      .order('position', { ascending: true });

    if (galleryError) {
      console.error('Error fetching gallery:', galleryError);
    }

    const startDate = new Date(event.start_time);
    const startTimeString = Number.isNaN(startDate.getTime())
      ? ''
      : `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;

    // Map to Event interface
    const mappedEvent: Event = {
      id: event.id,
      title: event.title,
      slug: event.slug || event.id,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time ?? null,
      date: event.start_time,
      time: startTimeString,
      venue: event.venue || undefined,
      location: event.location || '',
      address: event.address ?? undefined,
      city: event.city ?? undefined,
      country: event.country ?? undefined,
      currency: event.currency ?? undefined,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      categoryId: event.category_id ?? undefined,
      categoryCustom: event.category_custom ?? undefined,
      categoryName: event.category?.name ?? undefined,
      locationId: event.location_id ?? undefined,
      locationVisibility: event.location_visibility ?? 'public',
      hostName: undefined,
      image: event.image_url || null,
      gallery: (galleryImages || []).map(img => img.image_url),
      ticketType: (ticketTypes || []).map(ticket => ({
        name: ticket.name,
        price: ticket.price.toString(),
        quantity: ticket.quantity.toString(),
        sold: ticket.sold.toString(),
        details: ticket.details || undefined,
      })),
      socialMediaLinks: event.social_links || undefined,
      userId: event.user_id,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      isVirtual: event.is_virtual || false,
      virtualEventDetails: event.virtual_details || undefined,
    };

    return mappedEvent;
  } catch (error) {
    console.error('Error fetching event by slug:', error);
    return null;
  }
}

