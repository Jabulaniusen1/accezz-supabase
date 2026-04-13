'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { type Event, type Ticket } from '@/types/event';
import Toast from '../../../components/ui/Toast';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchEventBySlug } from '@/utils/eventUtils';
import { getTicketPurchaseState } from '@/utils/localStorage';
import { EventPageSkeleton } from './components/EventPageSkeleton';

const EventHeroSection = React.lazy(() => import('./components/EventHeroSection').then(module => ({ default: module.EventHeroSection })));
const EventTicketsSection = React.lazy(() => import('./components/TicketCard').then(module => ({ default: module.EventTicketsSection })));
const TicketTypeForm = React.lazy(() => import('../../components/TicketTypeForm'));
const OtherEventsYouMayLike = React.lazy(() => import('@/app/components/home/OtherEventsYouMayLike'));

type ToastType = {
  type: 'error' | 'success';
  message: string;
} | null;

const EventDetail = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [event, setEvent] = useState<Event | null>(null);

  const selectedTicketOption = useMemo(() => {
    if (!selectedTicket) return undefined;

    return {
      id: selectedTicket.id,
      name: selectedTicket.name,
      price: selectedTicket.price,
      quantity: selectedTicket.quantity,
      sold: selectedTicket.sold,
      details: selectedTicket.details || ''
    };
  }, [selectedTicket]);
  
  // Refs and routing
  const ticketsSectionRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const eventSlug = params?.id;

  // Memoized handlers
  const handleGetTicket = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketForm(true);
  }, []);

  const closeTicketForm = useCallback(() => {
    setShowTicketForm(false);
    setSelectedTicket(null);
  }, []);



  const scrollToTickets = useCallback(() => {
    ticketsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const showToast = useCallback((toast: ToastType) => {
    setToast(toast);
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
        if (!eventSlug || typeof eventSlug !== 'string') return;

        try {
            setLoading(true);
            // Clear any previous event data to prevent flash
            if (isMounted) {
                setEvent(null);
            }
            
            const fetchedEvent = await fetchEventBySlug(eventSlug);
            
            // ONLY UPDATE STATE IF COMPONENT IS STILL MOUNTED
            if (isMounted) {
                if (fetchedEvent) {
                    setEvent(fetchedEvent);
                    setError(false);
                } else {
                    setError(true);
                    // Only show error after loading is complete
                    showToast({ type: 'error', message: 'Event not found.' });
                }
            }
        } catch (err) {
            // CHECK IF COMPONENT IS STILL MOUNTED
            if (isMounted) {
                setError(true);
                console.error('Failed to fetch event:', err);
                // Only show error after loading is complete
                showToast({ type: 'error', message: 'Failed to load event details.' });
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    fetchEvent();

    // CLEANUP FUNCTION - THIS WILL RUN WHEN COMPONENT UNMOUNTS
    return () => {
        isMounted = false;
    };
  }, [eventSlug, showToast]);

  // Restore modal state on mount if saved
  useEffect(() => {
    try {
      const savedState = getTicketPurchaseState();
      if (savedState && savedState.eventSlug === eventSlug && savedState.showTicketForm) {
        setShowTicketForm(true);
      }
    } catch (error) {
      console.error('Error restoring modal state:', error);
    }
  }, [eventSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <EventPageSkeleton />
      </div>
    );
  }

  // Only show error state if loading completed and event is still null
  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-gray-700 dark:text-gray-300">Event not found.</p>
        </div>
      </div>
    );
  }

  // Show skeleton if event is not yet loaded (shouldn't happen if router works correctly)
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <EventPageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Global components */}
      <Header />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="event-page-main">
        <React.Suspense fallback={<EventPageSkeleton />}>
          {/* Breadcrumb Navigation */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="mx-auto lg:px-32 px-4 sm:px-6 py-4">
              <nav className="flex items-center space-x-2 text-sm">
                <Link href="/" className="text-gray-500 hover:text-[#f54502] transition-colors">Home</Link>
                <span className="text-gray-400">/</span>
                <Link href="/#events" className="text-gray-500 hover:text-[#f54502] transition-colors">Events</Link>
                <span className="text-gray-400">/</span>
                <span className="text-[#f54502] font-medium truncate">{event.title}</span>
              </nav>
            </div>
          </div>
          
          {/* Event sections with lazy loading */}
          <EventHeroSection event={event} scrollToTickets={scrollToTickets} />
          
          <div ref={ticketsSectionRef}>
            <EventTicketsSection 
              event={event} 
              handleGetTicket={handleGetTicket} 
            />
          </div>
          
        </React.Suspense>

        <React.Suspense fallback={<div>Loading related events...</div>}>
          <OtherEventsYouMayLike />
        </React.Suspense>


        {/* Ticket Form Modal */}
        {showTicketForm && (
          <React.Suspense fallback={null}>
            <TicketTypeForm
              closeForm={closeTicketForm}
              tickets={event?.ticketType.map(ticket => ({
                id: ticket.id,
                name: ticket.name,
                price: ticket.price,
                quantity: ticket.quantity,
                sold: ticket.sold,
                details: ticket.details || ''
              })) || []}
              eventSlug={eventSlug as string}
              setToast={showToast}
              isOpen={showTicketForm}
              initialTicket={selectedTicketOption}
            />
          </React.Suspense>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default React.memo(EventDetail);