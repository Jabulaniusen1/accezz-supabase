'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { Toast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
// import Loader from '@/components/ui/loader/Loader';
import { formatPrice } from '@/utils/formatPrice';
// Removed REST API usage; using Supabase instead

interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  date: string;
  time: string;
  location: string;
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
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm"
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

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
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
        .select('id, slug, title, description, image_url, date, time, location')
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

      const list: Event[] = (eventsData || []).map(e => ({
        id: e.id as string,
        slug: (e.slug as string) || e.id as string,
        title: e.title as string,
        description: e.description as string,
        image: (e.image_url as string) || '/images/placeholder.png',
        date: e.date as string,
        time: (e.time as string) || '',
        location: (e.location as string) || '',
        price: '0',
        ticketType: ticketTypeMap.get(e.id as string) || [],
      }));
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
      const { error } = await supabase.from('events').delete().eq('id', eventID);
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

  if (loading || isNavigating) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Loading Your Events</h2>
          <p className="text-gray-500 dark:text-gray-400">We&apos;re preparing your event dashboard...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Events Yet</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
          You haven&apos;t created any events yet. Start by creating your first event to manage tickets and track attendees.
        </p>
        <button
          onClick={() => router.push('/create-event')}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium rounded-lg shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
        >
          Create Your First Event
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Events</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Manage, edit, and track all your events in one place
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-[#f54502]">{formattedEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {formattedEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onCopyLink={copyLink}
            onEdit={() => handleNavigation(`update/${event.id}`)}
            onDelete={() => handleDeleteClick(event.id)}
          />
        ))}
      </motion.div>

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
  onDelete: () => void;
}> = ({ event, onCopyLink, onEdit, onDelete }) => {
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
          <span className="line-clamp-1">{event.location}</span>
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
            onClick={() => onCopyLink(event.slug)}
            className="flex-1 flex items-center justify-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Share
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors duration-200"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Analytics quick link */}
      <Link href={`/analytics?id=${event.id}`} passHref>
        <span className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </span>
      </Link>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-4 left-4 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </motion.div>
  );
};

export default EventList;