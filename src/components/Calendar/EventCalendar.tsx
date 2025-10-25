"use client";

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { Calendar } from 'react-calendar';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';
import { gsap } from 'gsap';
import { BASE_URL } from '../../../config';

interface Event {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
}

const EventCalendar = () => {
  const router = useRouter();
  const [showCalendar, setShowCalendar] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}api/v1/events/all-events`);
        setEvents(response.data.events);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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
    useEffect(() => {
      // GSAP animation for modal entrance
      gsap.fromTo('.modal-content', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5 });
    }, []);
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
        <div className="modal-content relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-4 sm:p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto transition-transform transform-gpu border border-gray-200 dark:border-gray-700 sm:max-w-md md:max-w-lg lg:max-w-xl">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 opacity-90 rounded-lg shadow-inner"></div>
          
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 transform rotate-45 translate-x-5 -translate-y-5 shadow-lg z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent dark:from-gray-600 rounded-tl-full"></div>
          </div>
  
          {/* Content */}
          <div className="relative z-10 flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Events on {selectedEvents[0]?.date ? new Date(selectedEvents[0].date).toLocaleDateString() : ''}
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
  
          <div className="space-y-6 relative z-10">
            {selectedEvents.map((event) => (
              <div 
                key={event.id}
                className="border-b dark:border-gray-700 pb-4 last:border-0 transition-transform transform hover:scale-105"
              >
                <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {event.title}
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <p className="flex items-center"><span role="img" aria-label="clock">🕒</span> {new Date(event.date).toLocaleDateString()} at {event.time}</p>
                  <p className="flex items-center"><span role="img" aria-label="location">📍</span> {event.venue}</p>
                  <p className="line-clamp-3 text-gray-500 dark:text-gray-400">{event.description}</p>
                </div>
                <button
                  onClick={() => {
                    router.push(`/${event.slug}`);
                    setShowModal(false);
                  }}
                  className="mt-4 flex items-center text-blue-600 hover:text-blue-700 
                           dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
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
    <div className="fixed right-4 top-24 z-50 text-black dark:text-white">
      {/* Calendar Icon Button */}
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg 
                   transform transition-transform duration-200 hover:scale-110
                   flex items-center justify-center"
        aria-label="Toggle Calendar"
      >
        <FaCalendarAlt className="text-xl " />
      </button>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 animate-fade-in">
          <Calendar
            className="rounded-lg border-none shadow-sm"
            tileClassName={({ date }) => 
              hasEvents(date) ? 
              'has-events bg-blue-100 dark:bg-blue-900 rounded-full font-bold' : ''
            }
            tileContent={({ date }) => {
              const dateEvents = getEventsForDate(date);
              return dateEvents.length > 0 ? (
                <div className="relative">
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white 
                                 rounded-full w-4 h-4 text-xs flex items-center justify-center">
                    {dateEvents.length}
                  </span>
                </div>
              ) : null;
            }}
            onClickDay={handleDayClick}
          />
          
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 
                          flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      )}

      {/* Event Details Modal */}
      {showModal && <EventModal />}
    </div>
  );
};

export default EventCalendar; 