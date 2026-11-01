'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, Zap } from '@/icon-adapters/lucide-react';
import { type Event, type Ticket } from '@/types/event';
import Toast from '../../../components/ui/Toast';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import { fetchEventBySlug } from '@/utils/eventUtils';
import { supabase } from '@/utils/supabaseClient';
import { EventPageSkeleton } from './components/EventPageSkeleton';

const EventHeroSection = React.lazy(() => import('./components/EventHeroSection').then(module => ({ default: module.EventHeroSection })));
const EventTicketsSection = React.lazy(() => import('./components/TicketCard').then(module => ({ default: module.EventTicketsSection })));
const OtherEventsYouMayLike = React.lazy(() => import('@/app/components/home/OtherEventsYouMayLike'));

type ToastType = {
  type: 'error' | 'success';
  message: string;
} | null;

// ── Promotion Banner ───────────────────────────────────────────────────────

interface AffiliateSettings {
  commission_type: string;
  commission_value: number;
}

function PromotionBanner({ eventId }: { eventId: string }) {
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);

  useEffect(() => {
    supabase
      .from('affiliate_settings')
      .select('commission_type, commission_value')
      .eq('event_id', eventId)
      .eq('enabled', true)
      .single()
      .then(({ data }) => { if (data) setSettings(data as AffiliateSettings); });
  }, [eventId]);

  if (!settings) return null;

  const commission =
    settings.commission_type === 'percentage'
      ? `${settings.commission_value}%`
      : `₦${settings.commission_value.toLocaleString()}`;

  return (
    <div className="page-container py-4">
      <div className="flex items-center gap-4 bg-gradient-to-r from-[#fff5f2] to-[#fff9f7] dark:from-[#2a1208] dark:to-[#1f0d05] border border-brand/20 rounded-xl px-5 py-4">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-brand/10">
          <Megaphone className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Earn {commission} promoting this event
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Share your unique link — get paid for every ticket sold through it
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg transition"
        >
          <Zap className="w-3.5 h-3.5" />
          Get link
        </Link>
      </div>
    </div>
  );
}

const EventDetail = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [event, setEvent] = useState<Event | null>(null);

  // Refs and routing
  const ticketsSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventSlug = params?.id;

  // Capture affiliate ref param and track the click
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (!ref) return;
    try {
      localStorage.setItem('affiliateRef', ref);
    } catch {}
    // Fire-and-forget click tracking
    fetch('/api/affiliates/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateCode: ref }),
    }).catch(() => {});
  }, [searchParams]);

  // Buying happens on the checkout page, with the chosen ticket preselected
  const handleGetTicket = useCallback((ticket: Ticket) => {
    router.push(`/${eventSlug}/checkout?ticket=${encodeURIComponent(ticket.id)}`);
  }, [router, eventSlug]);



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
            <div className="page-container py-4">
              <nav className="flex items-center space-x-2 text-sm">
                <Link href="/" className="text-gray-500 hover:text-brand transition-colors">Home</Link>
                <span className="text-gray-400">/</span>
                <Link href="/#events" className="text-gray-500 hover:text-brand transition-colors">Events</Link>
                <span className="text-gray-400">/</span>
                <span className="text-brand font-medium truncate">{event.title}</span>
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

          {event.id && <PromotionBanner eventId={event.id} />}

        </React.Suspense>

        <React.Suspense fallback={<div>Loading related events...</div>}>
          <OtherEventsYouMayLike />
        </React.Suspense>


      </div>

      <Footer />
    </div>
  );
};

export default React.memo(EventDetail);