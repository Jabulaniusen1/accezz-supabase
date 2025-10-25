// hooks/useOptimizedEvents.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BASE_URL } from '../../config';
import { Event } from '@/types/event';

const EVENT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

const fetchEvents = async <T,>(endpoint: string): Promise<T> => {
  const { data } = await axios.get(`${BASE_URL}${endpoint}`);
  return data.events;
};

export const useTrendingEvents = () => {
  return useQuery<Event[]>({
    queryKey: ['events', 'trending'],
    queryFn: () => fetchEvents('api/v1/events/all-events'),
    select: (data) => data.slice(0, 6),
    staleTime: EVENT_STALE_TIME,
  });
};

export const useLatestEvents = () => {
  return useQuery<Event[]>({
    queryKey: ['events', 'latest'],
    queryFn: () => fetchEvents('api/v1/events/sorted-by-latest'),
    select: (data) => data.slice(0, 3),
    staleTime: EVENT_STALE_TIME,
  });
};