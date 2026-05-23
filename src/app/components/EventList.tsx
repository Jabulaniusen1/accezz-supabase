'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { Toast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/utils/formatPrice';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ChartAreaIcon, PencilIcon, Share2, TrashIcon, MoreVertical } from '@/icon-adapters/lucide-react';
import { FaCalendarAlt } from '@/icon-adapters/react-icons/fa';
// Removed REST API usage; using Supabase instead

interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  startTime: string;
  endTime?: string | null;
  date: string;
  time: string;
  location: string;
  locationVisibility?: 'public' | 'undisclosed' | 'secret';
  isVirtual?: boolean;
  address?: string;
  city?: string;
  price: string;
  ticketType: { price: string; name: string; quantity: string; sold: string }[];
}

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}> = ({ isOpen, onClose, onConfirm, itemName }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete {itemName}?
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 pl-1">
              This will permanently remove your {itemName.toLowerCase()} and all associated data. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                style={{ borderRadius: '5px' }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{ borderRadius: '5px' }}
                className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

type EventTab = 'all' | 'published' | 'drafts' | 'ended';

const EVENT_TABS: { id: EventTab; label: string }[] = [
  { id: 'all', label: 'All Events' },
  { id: 'published', label: 'Published' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'ended', label: 'Ended' },
];

const EventList: React.FC<{
  onCreateEvent?: () => void;
  onEditEvent?: (id: string) => void;
  onAnalyticsEvent?: (id: string) => void;
}> = ({ onCreateEvent, onEditEvent, onAnalyticsEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventTab>('all');
  const [toastProps, setToastProps] = useState<{
    type: 'success' | 'error';
    message: string;
  }>({ type: 'success', message: '' });

  const router = useRouter();

  const showToastMessage = useCallback((type: 'success' | 'error', message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const message = error instanceof Error ? error.message : defaultMessage;
    showToastMessage('error', message);
  }, [showToastMessage]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push('/auth/login');
        return;
      }
      const uid = sessionData.session.user.id;

      // Fetch user's events
      const { data: eventsData, error: evErr } = await supabase
        .from('events')
        .select('id, slug, title, description, image_url, start_time, end_time, location, address, city')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (evErr) throw evErr;

      const eventIds = (eventsData || []).map(e => e.id);
      const ticketTypeMap = new Map<string, { price: string; name: string; quantity: string; sold: string }[]>();
      if (eventIds.length) {
        const { data: tickets, error: ttErr } = await supabase
          .from('ticket_types')
          .select('event_id, name, price, quantity, sold')
          .in('event_id', eventIds);
        if (ttErr) throw ttErr;
        (tickets || []).forEach(t => {
          const arr = ticketTypeMap.get(t.event_id as string) || [];
          arr.push({
            name: t.name as string,
            price: String(t.price ?? '0'),
            quantity: String(t.quantity ?? '0'),
            sold: String(t.sold ?? '0'),
          });
          ticketTypeMap.set(t.event_id as string, arr);
        });
      }

      const list: Event[] = (eventsData || []).map(e => {
        const startTime = (e.start_time as string) || '';
        const start = startTime ? new Date(startTime) : null;
        const timeValue =
          start && !Number.isNaN(start.getTime())
            ? `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`
            : '';

        return {
          id: e.id as string,
          slug: (e.slug as string) || e.id as string,
          title: e.title as string,
          description: e.description as string,
          image: (e.image_url as string) || '/images/placeholder.png',
          startTime,
          endTime: (e.end_time as string) || null,
          date: startTime,
          time: timeValue,
          location: (e.location as string) || '',
          address: (e.address as string) || undefined,
          city: (e.city as string) || undefined,
          price: '0',
          ticketType: ticketTypeMap.get(e.id as string) || [],
        };
      });
      setEvents(list);
    } catch (error) {
      handleError(error, 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleError, showToastMessage]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const copyLink = useCallback((eventSlug: string) => {
    const link = `${window.location.origin}/${eventSlug}`;
    navigator.clipboard.writeText(link);
    showToastMessage('success', `Event link copied to clipboard!`);
  }, [showToastMessage]);

  const handleDeleteClick = useCallback((eventId: string) => {
    setEventToDelete(eventId);
    setDeleteModalOpen(true);
  }, []);

  const deleteEvent = useCallback(async (eventID: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const deletedByUserId = sessionData.session?.user?.id || null;
      
      // Use soft delete function to move event to deleted_events table
      const { error } = await supabase.rpc('soft_delete_event', {
        event_id: eventID,
        deleted_by_user_id: deletedByUserId
      });
      if (error) throw error;
      return true;
    } catch (error) {
      handleError(error, 'An error occurred while deleting the event.');
      return false;
    }
  }, [handleError]);

  const handleConfirmDelete = useCallback(async () => {
    if (!eventToDelete) return;
    setLoading(true);
    try {
      const success = await deleteEvent(eventToDelete);
      if (success) {
        setEvents(prev => prev.filter(event => event.id !== eventToDelete));
        showToastMessage('success', 'Event deleted successfully.');
      }
    } catch (error) {
      handleError(error, 'Failed to delete event');
    } finally {
      setDeleteModalOpen(false);
      setEventToDelete(null);
      setLoading(false);
    }
  }, [eventToDelete, deleteEvent, handleError, showToastMessage]);

  const handleNavigation = useCallback((path: string) => {
    setIsNavigating(true);
    router.push(path);
  }, [router]);

  const formattedEvents = useMemo(() => events.map(event => ({
    ...event,
    formattedDate: new Date(event.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    minPrice: event.ticketType?.length > 0
      ? Math.min(...event.ticketType.map(ticket => parseFloat(ticket.price)))
      : 0,
    ticketsSold: event.ticketType?.reduce((acc, ticket) => acc + parseInt(ticket.sold || '0'), 0) || 0,
    totalTickets: event.ticketType?.reduce((acc, ticket) => acc + parseInt(ticket.quantity || '0'), 0) || 0,
  })), [events]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const ENDED_BUFFER = 24 * 60 * 60 * 1000; // 24 hours after start
    const isEnded = (e: { startTime: string; endTime?: string | null }) => {
      if (e.endTime) return new Date(e.endTime).getTime() < now;
      return new Date(e.startTime).getTime() + ENDED_BUFFER < now;
    };
    switch (activeTab) {
      case 'published':
        return formattedEvents.filter(e => !isEnded(e));
      case 'ended':
        return formattedEvents.filter(e => isEnded(e));
      case 'drafts':
        return [];
      default:
        return formattedEvents;
    }
  }, [formattedEvents, activeTab]);

  if (loading || isNavigating) return <TableSkeleton />;

  const tabBar = (
    <div className="mb-6">
      <div className="flex items-stretch border-b border-gray-100 dark:border-gray-800">
        {/* Horizontally scrollable tabs — no visible scrollbar */}
        <div className="flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {EVENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 ${
                activeTab === tab.id
                  ? 'border-[#f54502] text-[#f54502]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Action buttons — always visible, never pushed off screen */}
        <div className="flex items-center gap-1 pb-1 pl-1 flex-shrink-0">
          <button className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="hidden sm:inline text-xs font-medium">Filter</span>
          </button>
          <button
            onClick={() => onCreateEvent?.()}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-[#f54502] hover:bg-[#d63a02] active:bg-[#c03200] text-white text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">Add new event</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (events.length === 0) {
    return (
      <div>
        {tabBar}
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-280px)] px-4 text-center bg-gray-50 dark:bg-gray-900 rounded-xl py-16">
          {/* Calendar/notebook icon */}
          <div className="mb-6">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="16" width="56" height="54" rx="6" fill="#f9a88a" />
              <rect x="18" y="8" width="8" height="16" rx="4" fill="#f47847" />
              <rect x="54" y="8" width="8" height="16" rx="4" fill="#f47847" />
              <rect x="18" y="36" width="40" height="4" rx="2" fill="white" opacity="0.9" />
              <rect x="18" y="46" width="28" height="4" rx="2" fill="white" opacity="0.7" />
              <rect x="10" y="16" width="56" height="14" rx="6" fill="#f47847" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">You have no events!</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs text-sm mb-8">
            Click on the &quot;Add new event&quot; button below to create your first event.
          </p>
          <button
            onClick={() => onCreateEvent?.()}
            className="flex items-center gap-2 px-6 py-3 bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add new event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {tabBar}

      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <FaCalendarAlt size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No events in this category</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onCopyLink={copyLink}
              onEdit={() => onEditEvent ? onEditEvent(event.id) : handleNavigation(`update/${event.id}`)}
              onAnalytics={() => onAnalyticsEvent ? onAnalyticsEvent(event.id) : handleNavigation(`analytics?id=${event.id}`)}
              onDelete={() => handleDeleteClick(event.id)}
            />
          ))}
        </motion.div>
      )}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName="Event"
      />

      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

const EventCard: React.FC<{
  event: Event & {
    formattedDate: string;
    minPrice: number;
    ticketsSold: number;
    totalTickets: number;
  };
  onCopyLink: (slug: string) => void;
  onEdit: () => void;
  onAnalytics: () => void;
  onDelete: () => void;
}> = ({ event, onCopyLink, onEdit, onAnalytics, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const progressPercentage = event.totalTickets > 0 
    ? Math.min(100, (event.ticketsSold / event.totalTickets) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700 flex flex-col "
    >
      {/* Image with gradient overlay */}
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          width={400}
          height={240}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        
        {/* Status badge */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center">
          <span className={`h-2 w-2 rounded-full mr-2 ${progressPercentage >= 90 ? 'bg-red-500' : progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} />
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            {progressPercentage >= 90 ? 'Almost Full' : progressPercentage >= 50 ? 'Selling Fast' : 'Available'}
          </span>
        </div>
      </div>

      {/* Event details */}
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
            {event.title}
          </h3>
          <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 text-xs font-medium px-2.5 py-0.5 rounded-full ml-2 whitespace-nowrap">
            {event.ticketType?.length > 0 ? formatPrice(event.minPrice, '₦') : 'FREE'}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{event.formattedDate}, {event.time}</span>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-1">
            {event.locationVisibility === 'undisclosed'
              ? 'Location to be announced'
              : event.locationVisibility === 'secret'
                ? 'Location shared after purchase'
                : event.location || (event.isVirtual ? 'Online event' : 'Location to be announced')}
          </span>
        </div>

        {/* Ticket sales progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Tickets sold: {event.ticketsSold}/{event.totalTickets}</span>
            <span>{Math.round(progressPercentage)}% sold</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${progressPercentage >= 90 ? 'bg-red-500' : progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 mt-auto">
          <button
            onClick={onEdit}
            style={{ borderRadius: '5px' }}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            <span>Edit</span>
          </button>
          <button
            onClick={onAnalytics}
            style={{ borderRadius: '5px' }}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white text-sm transition-colors duration-200"
          >
            <ChartAreaIcon className="h-4 w-4 mr-2" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Menu button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          style={{ borderRadius: '5px' }}
          className="p-2 bg-white shadow-md dark:bg-gray-800/90 backdrop-blur-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-600"
        >
          <MoreVertical className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
                style={{ borderRadius: '5px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onCopyLink(event.slug);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <Share2 className="h-4 w-4 mr-3 text-indigo-500" />
                  <span>Share Event</span>
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <TrashIcon className="h-4 w-4 mr-3" />
                  <span>Delete Event</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default EventList;