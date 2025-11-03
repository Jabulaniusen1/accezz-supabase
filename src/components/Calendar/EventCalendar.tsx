"use client";

import React, { useState } from 'react';
import { FaCalendarAlt, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import { Calendar } from 'react-calendar';
import { useRouter } from 'next/navigation';
import 'react-calendar/dist/Calendar.css';
import { useAllEvents } from '@/hooks/useEvents';
import { formatEventDate } from '@/utils/formatDateTime';

interface Event {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  venue?: string;
  location?: string;
  description: string;
}

const EventCalendar = () => {
  const router = useRouter();
  const { data: allEvents, isLoading } = useAllEvents();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Map events to the format needed by the calendar
  const events: Event[] = (allEvents || []).map(event => ({
    id: event.id || '',
    slug: event.slug || event.id || '',
    title: event.title,
    date: event.date,
    time: event.time || '',
    venue: event.venue || event.location || '',
    location: event.location || event.venue || '',
    description: event.description || ''
  }));

  const hasEvents = (date: Date) => {
    return events.some(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Function to get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handleDayClick = (value: Date) => {
    const dateEvents = getEventsForDate(value);
    if (dateEvents.length > 0) {
      setSelectedEvents(dateEvents);
      setShowModal(true);
    }
  };

  const EventModal = () => {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-[5px] shadow-xl p-4 sm:p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Events on {selectedEvents[0]?.date ? formatEventDate(selectedEvents[0].date) : ''}
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 rounded-[5px] hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
  
          <div className="space-y-4">
            {selectedEvents.map((event) => (
              <div 
                key={event.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0"
              >
                <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {event.title}
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-2">
                    <span className="text-[#f54502]">🕒</span>
                    <span>{formatEventDate(event.date)} {event.time && `at ${event.time}`}</span>
                  </p>
                  {(event.venue || event.location) && (
                    <p className="flex items-center gap-2">
                      <span className="text-[#f54502]">📍</span>
                      <span>{event.venue || event.location}</span>
                    </p>
                  )}
                  {event.description && (
                    <p className="line-clamp-3 text-gray-500 dark:text-gray-400 mt-2">{event.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    router.push(`/${event.slug}`);
                    setShowModal(false);
                  }}
                  className="mt-4 flex items-center text-[#f54502] hover:text-[#d63a02] font-medium transition-colors text-sm sm:text-base"
                >
                  View Details 
                  <FaExternalLinkAlt className="ml-2 text-sm" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  

  return (
    <>
      <style jsx global>{`
        .react-calendar {
          @apply bg-white dark:bg-gray-800 border-none shadow-sm;
          border-radius: 5px;
        }
        .react-calendar__navigation button {
          @apply text-gray-700 dark:text-gray-300;
          border-radius: 5px;
          min-width: 44px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          @apply bg-[#f54502]/10 dark:bg-[#f54502]/20;
        }
        .react-calendar__tile {
          @apply text-gray-900 dark:text-gray-200;
          border-radius: 5px;
        }
        .react-calendar__tile:enabled:hover {
          @apply bg-[#f54502]/10 dark:bg-[#f54502]/20;
        }
        .react-calendar__tile--active {
          @apply bg-[#f54502] text-white;
        }
        .react-calendar__tile--now {
          @apply bg-[#f54502]/20 dark:bg-[#f54502]/30;
        }
        .has-events {
          @apply relative;
        }
        .has-events::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #f54502;
          border-radius: 50%;
        }
      `}</style>
      <div className="fixed right-4 top-24 z-50 text-black dark:text-white">
        {/* Calendar Icon Button */}
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="bg-[#f54502] hover:bg-[#d63a02] text-white p-3 rounded-[5px] shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center justify-center"
          aria-label="Toggle Calendar"
        >
          <FaCalendarAlt className="text-lg sm:text-xl" />
        </button>

        {/* Calendar Popup */}
        {showCalendar && (
          <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-[5px] shadow-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <Calendar
              tileClassName={({ date }) => 
                hasEvents(date) ? 'has-events font-semibold' : ''
              }
              tileContent={({ date }) => {
                const dateEvents = getEventsForDate(date);
                return dateEvents.length > 0 ? (
                  <div className="relative">
                    <span className="absolute -top-1 -right-1 bg-[#f54502] text-white rounded-[5px] w-5 h-5 text-xs flex items-center justify-center font-bold">
                      {dateEvents.length}
                    </span>
                  </div>
                ) : null;
              }}
              onClickDay={handleDayClick}
            />
            
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-[5px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f54502]"></div>
              </div>
            )}
          </div>
        )}

        {/* Event Details Modal */}
        {showModal && <EventModal />}
      </div>
    </>
  );
};

export default EventCalendar; 