// hooks/useEvents.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Event, TrendingEvent } from '@/types/event';
import { supabase } from '@/utils/supabaseClient';

// Shapes returned from Supabase we actually use
type SupabaseEventRow = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  venue?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  image_url?: string | null;
  social_links?: unknown;
  user_id: string;
  created_at: string;
  updated_at: string;
  country?: string | null;
  currency?: string | null;
  is_virtual?: boolean | null;
  virtual_details?: unknown;
  location_id?: string | null;
  category_id?: string | null;
  category_custom?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_visibility?: 'public' | 'undisclosed' | 'secret' | null;
  category?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

type TicketTypeRow = {
  name: string;
  price: number | string;
  quantity: number | string;
  sold: number | string;
  details?: string | null;
  event_id?: string;
};

// Helper function to map Supabase event data to Event interface
const mapSupabaseEventToEvent = (supabaseEvent: SupabaseEventRow, ticketTypes: TicketTypeRow[]): Event => {
  const startDate = new Date(supabaseEvent.start_time);
  const startTimeString = Number.isNaN(startDate.getTime())
    ? ''
    : `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;

  return {
    id: supabaseEvent.id,
    title: supabaseEvent.title,
    slug: supabaseEvent.slug,
    description: supabaseEvent.description ?? '',
    startTime: supabaseEvent.start_time,
    endTime: supabaseEvent.end_time ?? null,
    date: supabaseEvent.start_time,
    time: startTimeString,
    venue: supabaseEvent.venue ?? undefined,
    location: supabaseEvent.location ?? '',
    address: supabaseEvent.address ?? undefined,
    city: supabaseEvent.city ?? undefined,
    country: supabaseEvent.country ?? undefined,
    currency: supabaseEvent.currency ?? undefined,
    latitude: typeof supabaseEvent.latitude === 'number' ? supabaseEvent.latitude : null,
    longitude: typeof supabaseEvent.longitude === 'number' ? supabaseEvent.longitude : null,
    categoryId: supabaseEvent.category_id ?? undefined,
    categoryCustom: supabaseEvent.category_custom ?? undefined,
    categoryName: supabaseEvent.category?.name ?? undefined,
    categorySlug: supabaseEvent.category?.slug ?? undefined,
    locationId: supabaseEvent.location_id ?? undefined,
    locationVisibility: supabaseEvent.location_visibility ?? 'public',
    hostName: undefined,
    image: supabaseEvent.image_url || null,
    gallery: [], // We'll fetch gallery separately if needed
    ticketType: ticketTypes.map(ticket => ({
      name: ticket.name,
      price: String(ticket.price),
      quantity: String(ticket.quantity),
      sold: String(ticket.sold),
      details: ticket.details || undefined,
    })),
    socialMediaLinks: supabaseEvent.social_links || undefined,
    userId: supabaseEvent.user_id,
    createdAt: supabaseEvent.created_at,
    updatedAt: supabaseEvent.updated_at,
    isVirtual: supabaseEvent.is_virtual ?? false,
    virtualEventDetails: supabaseEvent.virtual_details ?? undefined,
  };
};

// Fetch all published/public events with their ticket types
const fetchEventsFromSupabase = async (): Promise<Event[]> => {
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*, category:event_categories(name, slug)')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  if (eventsError) {
    throw eventsError;
  }

  if (!events || events.length === 0) {
    return [];
  }

  // Fetch ticket types for all events
  const eventIds = events.map(e => e.id);
  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from('ticket_types')
    .select('*')
    .in('event_id', eventIds);

  if (ticketTypesError) {
    throw ticketTypesError;
  }

  // Map events with their ticket types
  return events.map((event) => {
    const eventTicketTypes = (ticketTypes || []).filter((tt) => tt.event_id === event.id) as TicketTypeRow[];
    return mapSupabaseEventToEvent(event as unknown as SupabaseEventRow, eventTicketTypes);
  });
};

export const useTrendingEvents = () => {
  return useQuery({
    queryKey: ['trendingEvents'],
    queryFn: async () => {
      const events = await fetchEventsFromSupabase();
      return events.slice(0, 6) as TrendingEvent[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useLatestEvents = () => {
  return useQuery({
    queryKey: ['latestEvents'],
    queryFn: async () => {
      const events = await fetchEventsFromSupabase();
      return events.slice(0, 3) as Event[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAllEvents = () => {
  return useQuery<Event[]>({
    queryKey: ['allEvents'],
    queryFn: async () => {
      return await fetchEventsFromSupabase();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useServerStatus = () => {
  const [isServerDown, setIsServerDown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkServerStatus = async () => {
      try {
        await supabase
          .from('events')
          .select('id')
          .limit(1);
        
        if (isMounted) {
          setIsServerDown(false);
        }
      } catch {
        if (isMounted) {
          setIsServerDown(true);
        }
      }
    };

    checkServerStatus();
    const intervalId = setInterval(checkServerStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return isServerDown;
};