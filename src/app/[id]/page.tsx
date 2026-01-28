'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import EventNotFound from '@/components/EventNotFound';
import { fetchEventBySlug } from '@/utils/eventUtils';
import Header from '@/app/components/layout/Header';
import { EventPageSkeleton } from './event/components/EventPageSkeleton';
import { VirtualEventPageSkeleton } from './virtual/components/VirtualEventPageSkeleton';

// Dynamically import the event pages to reduce initial bundle size
const VirtualEventPage = dynamic(() => import('./virtual/page'), {
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <VirtualEventPageSkeleton />
    </div>
  ),
  ssr: false
});

const PhysicalEventPage = dynamic(() => import('./event/page'), {
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <EventPageSkeleton />
    </div>
  ),
  ssr: false
});

export default function EventRouterPage() {
  const [eventType, setEventType] = useState<'virtual' | 'physical' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = useParams();
  const eventSlug = params?.id;

  const fetchEventType = useCallback(async () => {
    if (!eventSlug || typeof eventSlug !== 'string') return;
    setIsLoading(true);
    setError(false);
    try {
      const event = await fetchEventBySlug(eventSlug);
      if (event) {
        setEventType(event.isVirtual ? 'virtual' : 'physical');
      } else {
        setError(true);
        setEventType(null);
      }
    } catch (error) {
      console.error('Error fetching event type:', error);
      setError(true);
      setEventType(null);
    } finally {
      setIsLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    fetchEventType();
  }, [fetchEventType]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <EventPageSkeleton />
      </div>
    );
  }

  if (error || eventType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300"><EventNotFound /></p>
      </div>
    );
  }

  return eventType === 'virtual' ? <VirtualEventPage /> : <PhysicalEventPage />;
}