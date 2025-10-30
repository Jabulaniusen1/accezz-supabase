'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { type Event, type Ticket } from '@/types/event';
import Loader from '../../../components/ui/loader/Loader';
import Toast from '../../../components/ui/Toast';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchEventBySlug } from '@/utils/eventUtils';

const EventHeroSection = React.lazy(() => import('./components/EventHeroSection').then(module => ({ default: module.EventHeroSection })));
const EventHostSection = React.lazy(() => import('./components/EventHostSection').then(module => ({ default: module.EventHostSection })));
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
  const [toast, setToast] = useState<ToastType>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  
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
            const fetchedEvent = await fetchEventBySlug(eventSlug);
            
            // ONLY UPDATE STATE IF COMPONENT IS STILL MOUNTED
            if (isMounted) {
                if (fetchedEvent) {
                    setEvent(fetchedEvent);
                } else {
                    showToast({ type: 'error', message: 'Event not found.' });
                }
            }
        } catch (err) {
            // CHECK IF COMPONENT IS STILL MOUNTED
            if (isMounted) {
                console.error('Failed to fetch event:', err);
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

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Global components */}
      <Header />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="event-page-main">
        {event && (
          <React.Suspense fallback={<Loader />}>
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
            <EventHostSection event={event} />
            
            <div ref={ticketsSectionRef}>
              <EventTicketsSection 
                event={event} 
                handleGetTicket={handleGetTicket} 
              />
            </div>
            
          </React.Suspense>
        )}

        <React.Suspense fallback={<div>Loading related events...</div>}>
          <OtherEventsYouMayLike />
        </React.Suspense>


        {/* Ticket Form Modal */}
        {showTicketForm && (
          <React.Suspense fallback={<Loader />}>
            <TicketTypeForm
              closeForm={closeTicketForm}
              tickets={event?.ticketType.map(ticket => ({
                id: event.id || '',
                name: ticket.name,
                price: ticket.price,
                quantity: ticket.quantity,
                sold: ticket.sold,
                details: ticket.details || ''
              })) || []}
              eventSlug={eventSlug as string}
              setToast={showToast}
            />
          </React.Suspense>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default React.memo(EventDetail);