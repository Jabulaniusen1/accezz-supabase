'use client';
import React, { useEffect, useState } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaBookmark } from '@/icon-adapters/react-icons/fa';
import Image from 'next/image';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import { supabase } from '@/utils/supabaseClient';
import { formatPrice } from '@/utils/formatPrice';
import { formatEventDate } from '@/utils/formatDateTime';

interface SavedEventData {
  id: string;
  title: string;
  slug: string | null;
  date: string;
  startTime: string;
  location: string;
  venue?: string;
  image: string | null;
  isVirtual: boolean;
  locationVisibility?: string;
  ticketType: Array<{ id: string; price: string }>;
}

interface SavedEventRow {
  id: string;
  title: string;
  slug: string | null;
  start_time: string;
  location: string | null;
  venue: string | null;
  image_url: string | null;
  is_virtual: boolean;
  location_visibility: string | null;
  ticket_types: Array<{ id: string; price: number | string | null }> | null;
}

const SavedEvents = () => {
  const { savedIds, loading: idsLoading, toggle } = useSavedEvents();
  const [events, setEvents] = useState<SavedEventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (idsLoading) return;
    if (savedIds.size === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const fetchSavedEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, slug, start_time, location, venue, image_url, is_virtual, location_visibility,
          ticket_types(id, price)
        `)
        .in('id', Array.from(savedIds));

      if (!error && data) {
        const rows = data as SavedEventRow[];
        setEvents(rows.map((e) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          date: e.start_time,
          startTime: e.start_time,
          location: e.location || '',
          venue: e.venue ?? undefined,
          image: e.image_url,
          isVirtual: e.is_virtual,
          locationVisibility: e.location_visibility ?? undefined,
          ticketType: (e.ticket_types || []).map((t) => ({ id: t.id, price: String(t.price) })),
        })));
      }
      setLoading(false);
    };

    fetchSavedEvents();
  }, [savedIds, idsLoading]);

  const handleViewDetails = (eventSlug: string) => {
    window.open(`${window.location.origin}/${eventSlug}`, '_blank', 'noopener,noreferrer');
  };

  if (idsLoading || loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-6">🔖</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No saved events yet</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Bookmark events from the home page to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 hover:border-[#f54502]/50 overflow-hidden cursor-pointer"
          style={{ borderRadius: '10px' }}
          onClick={() => event.slug && handleViewDetails(event.slug as string)}
        >
          <div className="flex gap-4 h-full min-w-0">
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 hover:text-[#f54502] transition-colors line-clamp-2">
                  {event.title}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <FaCalendarAlt className="mr-2 flex-shrink-0" />
                    <span className="text-sm">{formatEventDate(event.date || event.startTime || '')}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 min-w-0">
                    <FaMapMarkerAlt className="mr-2 flex-shrink-0" />
                    <span className="text-sm truncate flex-1 min-w-0">
                      {event.locationVisibility === 'undisclosed'
                        ? 'Location to be announced'
                        : event.locationVisibility === 'secret'
                          ? 'Location shared after purchase'
                          : event.location || (event.isVirtual ? 'Online event' : 'Location to be announced')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[#f54502] font-semibold text-lg">
                  {(() => {
                    const prices = (event.ticketType || [])
                      .map((t: { price: string }) => parseFloat(t.price ?? '0'))
                      .filter((p: number) => !Number.isNaN(p));
                    if (!prices.length || Math.min(...prices) === 0) return 'Free';
                    return formatPrice(Math.min(...prices), '₦');
                  })()}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(event.id); }}
                  className="p-2 rounded-full hover:bg-[#f54502]/10 transition-colors"
                  title="Remove from saved"
                >
                  <FaBookmark className="text-[#f54502]" size={16} />
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 w-36 h-36">
              <Image
                src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                alt={event.title}
                width={144}
                height={144}
                className="w-full h-full object-cover"
                style={{ borderRadius: '5px' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedEvents;
