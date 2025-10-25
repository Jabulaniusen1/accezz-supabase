// components/EventLocationSection.tsx
import React from 'react';
import { type Event } from '@/types/event';

interface EventLocationSectionProps {
  event: Event;
}

export const EventLocationSection = ({ event }: EventLocationSectionProps) => {
  return (
    <div className="mt-10 text-center px-4 md:px-10">
      <div className="mt-6">
        {event?.venue ? (
          <iframe
            src={`https://www.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed`}
            className="w-full h-72 rounded-lg shadow-lg border-0"
            loading="lazy"
            title="Event Location Map"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-72 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Map not available</p>
          </div>
        )}
      </div>
    </div>
  );
};