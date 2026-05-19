'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import Toast from '@/components/ui/Toast';
import TicketTypeForm from '@/app/components/TicketTypeForm';
import { fetchEventBySlug } from '@/utils/eventUtils';
import { getTicketPurchaseState } from '@/utils/localStorage';
import { type Event, type Ticket } from '@/types/event';
import { VirtualEventPageSkeleton } from './components/VirtualEventPageSkeleton';

import { EventHeroSection } from '../event/components/EventHeroSection';
import { EventTicketsSection } from '../event/components/TicketCard';
import EventGallerySection from '../event/components/EventGallerySection';
import OtherEventsYouMayLike from '@/app/components/home/OtherEventsYouMayLike';
import VirtualEventDetails, { getVirtualPlatformLabel } from './components/VirtualEventDetails';
import VirtualEventCountdown from './components/VirtualEventCountdown';

type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function VirtualEventPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const ticketsSectionRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const params = useParams();
  const eventSlug = params?.id;
  const router = useRouter();

  const showToast = useCallback((toastValue: ToastState) => {
    setToast(toastValue);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (toastValue) {
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimeoutRef.current = null;
      }, 3000);
    }
  }, []);

  const selectedTicketOption = useMemo(() => {
    if (!selectedTicket) return undefined;

    return {
      id: selectedTicket.id,
      name: selectedTicket.name,
      price: selectedTicket.price,
      quantity: selectedTicket.quantity,
      sold: selectedTicket.sold,
      details: selectedTicket.details || '',
    };
  }, [selectedTicket]);

  useEffect(() => {
    let isMounted = true;

    const loadEvent = async () => {
      if (!eventSlug || typeof eventSlug !== 'string') return;

      try {
        setLoading(true);
        // Clear any previous event data to prevent flash
        if (isMounted) {
          setEvent(null);
        }
        
        const fetchedEvent = await fetchEventBySlug(eventSlug);
        
        if (!fetchedEvent) {
          if (isMounted) {
            setError(true);
            setLoading(false);
            // Only show error after loading is complete
            showToast({ type: 'error', message: 'Event not found.' });
          }
          return;
        }

        if (!fetchedEvent.isVirtual) {
          if (isMounted) {
            setLoading(false);
          }
          router.push(`/${eventSlug}`);
          return;
        }

        if (isMounted) {
          setEvent(fetchedEvent);
        }
      } catch (error) {
        console.error('Failed to load virtual event:', error);
        if (isMounted) {
          setError(true);
          // Only show error after loading is complete
          showToast({ type: 'error', message: 'Failed to load event details.' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventSlug, router, showToast]);

  useEffect(() => {
    try {
      const savedState = getTicketPurchaseState();
      if (savedState && savedState.eventSlug === eventSlug && savedState.showTicketForm) {
        setShowTicketForm(true);
      }
    } catch (error) {
      console.error('Error restoring ticket state:', error);
    }
  }, [eventSlug]);

  const scrollToTickets = useCallback(() => {
    ticketsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleGetTicket = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketForm(true);
  }, []);

  const closeTicketForm = useCallback(() => {
    setShowTicketForm(false);
    setSelectedTicket(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <VirtualEventPageSkeleton />
      </div>
    );
  }

  // Only show error state if loading completed and event is still null
  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        {toast && <Toast type={toast.type} message={toast.message} onClose={() => showToast(null)} />}
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
        <VirtualEventPageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => showToast(null)} />}

      <div className="event-page-main">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="mx-auto px-4 sm:px-6 lg:px-32 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link href="/" className="text-gray-500 hover:text-[#f54502] transition-colors">
                Home
              </Link>
              <span className="text-gray-400">/</span>
              <Link href="/#events" className="text-gray-500 hover:text-[#f54502] transition-colors">
                Events
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-[#f54502] font-medium truncate">{event.title}</span>
            </nav>
          </div>
        </div>

        <EventHeroSection
          event={event}
          scrollToTickets={scrollToTickets}
          showMap={false}
          virtualPlatformLabel={getVirtualPlatformLabel(event)}
        />
        <div className="bg-white dark:bg-gray-900 py-10">
          <div className="mx-auto px-4 sm:px-6 lg:px-32 grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <VirtualEventDetails event={event} />
            </div>
            <div className="space-y-10">
              <VirtualEventCountdown event={event} />
          </div>
          </div>
        </div>

        <div ref={ticketsSectionRef}>
          <EventTicketsSection event={event} handleGetTicket={handleGetTicket} />
        </div>

          <EventGallerySection event={event} />

        <OtherEventsYouMayLike />
      </div>

      {showTicketForm && (
        <TicketTypeForm
          closeForm={closeTicketForm}
          tickets={event.ticketType.map((ticket) => ({
            id: ticket.id,
            name: ticket.name,
            price: ticket.price,
            quantity: ticket.quantity,
            sold: ticket.sold,
            details: ticket.details || '',
          }))}
          eventSlug={eventSlug as string}
          setToast={showToast}
          isOpen={showTicketForm}
          initialTicket={selectedTicketOption}
        />
      )}

      <Footer />
    </div>
  );
}
