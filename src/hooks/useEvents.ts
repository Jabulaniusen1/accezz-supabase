// hooks/useEvents.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BASE_URL } from '../../config';
import { useEffect, useState } from 'react';
import { Event, TrendingEvent } from '@/types/event';

export const useTrendingEvents = () => {
  return useQuery({
    queryKey: ['trendingEvents'],
    queryFn: async () => {
      const { data } = await axios.get(`${BASE_URL}api/v1/events/all-events`);
      return data.events.slice(0, 6) as TrendingEvent[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useLatestEvents = () => {
  return useQuery({
    queryKey: ['latestEvents'],
    queryFn: async () => {
      const { data } = await axios.get(`${BASE_URL}api/v1/events/sorted-by-latest`);
      return data.events.slice(0, 3) as Event[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAllEvents = () => {
  return useQuery<Event[]>({
    queryKey: ['allEvents'],
    queryFn: async () => {
      const { data } = await axios.get(`${BASE_URL}api/v1/events/all-events`);
      return data.events;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useServerStatus = () => {
  const [isServerDown, setIsServerDown] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const checkServerStatus = async () => {
      try {
        const response = await axios.get(`${BASE_URL}api/v1/events/all-events`, {
          signal: controller.signal
        });
        setIsServerDown(response.status === 503);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setIsServerDown(false);
        }
      }
    };

    checkServerStatus();
    const intervalId = setInterval(checkServerStatus, 30000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, []);

  return isServerDown;
};