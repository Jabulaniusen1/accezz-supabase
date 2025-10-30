import { supabase } from './supabaseClient';
import { Event } from '@/types/event';

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
      .select('*')
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

    // Map to Event interface
    const mappedEvent: Event = {
      id: event.id,
      title: event.title,
      slug: event.slug || event.id,
      description: event.description,
      date: event.date,
      time: event.time || '',
      venue: event.venue || '',
      location: event.location || '',
      hostName: '', // We might need to fetch from profiles if required
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
      country: event.country,
      currency: event.currency,
      isVirtual: event.is_virtual || false,
      virtualEventDetails: event.virtual_details || undefined,
    };

    return mappedEvent;
  } catch (error) {
    console.error('Error fetching event by slug:', error);
    return null;
  }
}

