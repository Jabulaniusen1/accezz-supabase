import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { type Event } from '@/types/event';

interface EventHostSectionProps {
  event: Event;
}

export const EventHostSection = ({ event }: EventHostSectionProps) => {
  return (
    <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6 flex justify-between items-center px-4 md:px-10">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        The event is hosted by: 
        <span className="font-semibold"> {event?.hostName}</span>
      </p>
      <div className="flex flex-col">
        {event ? (
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {event.title}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(event.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <FiArrowRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">Not Available</p>
        )}
      </div>
    </div>
  );
};