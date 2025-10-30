// hooks/useEvents.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Event, TrendingEvent } from '@/types/event';
import { supabase } from '@/utils/supabaseClient';

// Helper function to map Supabase event data to Event interface
const mapSupabaseEventToEvent = (supabaseEvent: any, ticketTypes: any[]): Event => {
  return {
    id: supabaseEvent.id,
    title: supabaseEvent.title,
    slug: supabaseEvent.slug,
    description: supabaseEvent.description,
    date: supabaseEvent.date,
    time: supabaseEvent.time || '',
    venue: supabaseEvent.venue || '',
    location: supabaseEvent.location || '',
    hostName: '', // We'll need to fetch from profiles if needed
    image: supabaseEvent.image_url || null,
    gallery: [], // We'll fetch gallery separately if needed
    ticketType: ticketTypes.map(ticket => ({
      name: ticket.name,
      price: ticket.price.toString(),
      quantity: ticket.quantity.toString(),
      sold: ticket.sold.toString(),
      details: ticket.details || undefined,
    })),
    socialMediaLinks: supabaseEvent.social_links || undefined,
    userId: supabaseEvent.user_id,
    createdAt: supabaseEvent.created_at,
    updatedAt: supabaseEvent.updated_at,
    country: supabaseEvent.country,
    currency: supabaseEvent.currency,
    isVirtual: supabaseEvent.is_virtual || false,
    virtualEventDetails: supabaseEvent.virtual_details || undefined,
  };
};

// Fetch all published/public events with their ticket types
const fetchEventsFromSupabase = async (): Promise<Event[]> => {
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
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
  return events.map(event => {
    const eventTicketTypes = ticketTypes?.filter(tt => tt.event_id === event.id) || [];
    return mapSupabaseEventToEvent(event, eventTicketTypes);
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
        const { error } = await supabase
          .from('events')
          .select('id')
          .limit(1);
        
        if (isMounted) {
          setIsServerDown(false);
        }
      } catch (error) {
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