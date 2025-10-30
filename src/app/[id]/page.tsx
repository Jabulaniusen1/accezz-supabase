'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Loader from '@/components/ui/loader/Loader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import EventNotFound from '@/components/EventNotFound';
import { fetchEventBySlug } from '@/utils/eventUtils';

// Dynamically import the event pages to reduce initial bundle size
const VirtualEventPage = dynamic(() => import('./virtual/page'), {
  loading: () => <Loader />,
  ssr: false
});

const PhysicalEventPage = dynamic(() => import('./event/page'), {
  loading: () => <Loader />,
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
      <div className="container mx-auto p-4">
        <CardSkeleton />
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