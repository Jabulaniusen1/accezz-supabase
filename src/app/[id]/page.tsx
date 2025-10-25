'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import Loader from '@/components/ui/loader/Loader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import EventNotFound from '@/components/EventNotFound';
import { BASE_URL } from '../../../config';

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
    if (!eventSlug) return;
    setIsLoading(true);
    setError(false);
    try {
      const response = await axios.get(`${BASE_URL}api/v1/events/slug/${eventSlug}`, {
        timeout: 5000
      });
      setEventType(response.data.event.isVirtual ? 'virtual' : 'physical');
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