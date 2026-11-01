"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'react-calendar';
import { FaCalendarAlt } from '@/icon-adapters/react-icons/fa';
import { ChevronLeft, ChevronRight, Clock, MapPin, X } from '@/icon-adapters/lucide-react';
import { useAllEvents } from '@/hooks/useEvents';
import { formatEventTime } from '@/utils/formatDateTime';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

interface CalendarEvent {
  id: string;
  slug: string;
  title: string;
  start: Date;
  time: string;
  place: string;
  image: string | null;
}

const MAX_DOTS = 3;

/** Local calendar day, so events land on the day the viewer sees */
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const EventCalendar = () => {
  const { data: allEvents, isLoading } = useAllEvents();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const events = useMemo<CalendarEvent[]>(() =>
    (allEvents || [])
      .map((event) => ({
        id: event.id || '',
        slug: event.slug || event.id || '',
        title: event.title,
        start: new Date(event.date || event.startTime || ''),
        time: event.time || '',
        place: event.isVirtual ? 'Online event' : event.venue || event.location || '',
        image: typeof event.image === 'string' ? event.image : null,
      }))
      .filter((event) => !Number.isNaN(event.start.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
  [allEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = dayKey(event.start);
      map.set(key, [...(map.get(key) || []), event]);
    });
    return map;
  }, [events]);

  // Close on Escape or a click outside the calendar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const today = startOfToday();
  const monthEvents = events.filter((event) => monthKey(event.start) === monthKey(activeMonth));
  const listedEvents = selectedDate ? eventsByDay.get(dayKey(selectedDate)) || [] : monthEvents;
  const listTitle = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : `${activeMonth.toLocaleDateString('en-US', { month: 'long' })} events${monthEvents.length ? ` (${monthEvents.length})` : ''}`;

  return (
    <div ref={containerRef} className="fixed bottom-[100px] right-6 z-50">
      {/* Stacked above the WhatsApp button (bottom-6 right-6, 60px) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-brand hover:bg-brand-dark text-white h-[60px] w-[60px] rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center"
        aria-label={open ? 'Close event calendar' : 'Open event calendar'}
        aria-expanded={open}
      >
        <FaCalendarAlt className="text-lg sm:text-xl" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Event calendar"
          className="absolute right-0 bottom-full mb-3 w-[min(22rem,calc(100vw-3rem))] max-h-[calc(100dvh-190px)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-white">Event calendar</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dates with a dot have events</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="-mr-1 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
              aria-label="Close event calendar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar */}
          <div className="relative px-3 pt-2">
            <Calendar
              className="accezz-calendar"
              value={selectedDate}
              onClickDay={(date) => setSelectedDate((current) => (current && dayKey(current) === dayKey(date) ? null : date))}
              onActiveStartDateChange={({ activeStartDate, view }) => {
                if (activeStartDate && view === 'month') {
                  setActiveMonth(activeStartDate);
                  setSelectedDate(null);
                }
              }}
              minDetail="year"
              // Only upcoming events are loaded, so earlier months would always be empty
              minDate={today}
              showFixedNumberOfWeeks
              prev2Label={null}
              next2Label={null}
              prevLabel={<ChevronLeft className="h-4 w-4" />}
              nextLabel={<ChevronRight className="h-4 w-4" />}
              tileClassName={({ date, view }) => {
                if (view !== 'month') return null;
                const classes = [];
                if (eventsByDay.has(dayKey(date))) classes.push('has-events');
                if (date < today) classes.push('is-past');
                return classes;
              }}
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;
                const count = eventsByDay.get(dayKey(date))?.length || 0;
                return (
                  <span className="cal-dots" aria-hidden={count === 0}>
                    {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => <span key={i} className="cal-dot" />)}
                    {count > 0 && <span className="sr-only">{count} event{count > 1 ? 's' : ''}</span>}
                  </span>
                );
              }}
            />

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              </div>
            )}
          </div>

          {/* Events for the selected day, or the month. Fixed height: the popup
              grows upwards, so a changing height would move the grid under the cursor. */}
          <div className="flex h-56 flex-col border-t border-gray-100 dark:border-gray-800 px-4 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{listTitle}</p>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-medium text-brand hover:text-brand-dark"
                >
                  Show month
                </button>
              )}
            </div>

            {listedEvents.length === 0 ? (
              <p className="flex flex-1 items-center justify-center pb-6 text-sm text-gray-500 dark:text-gray-400">
                {selectedDate ? 'No events on this day.' : 'No events this month.'}
              </p>
            ) : (
              <ul className="-mx-1 flex-1 space-y-1 overflow-y-auto overscroll-contain px-1 pb-3">
                {listedEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/${event.slug}`}
                      onClick={() => setOpen(false)}
                      className="-mx-2 flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg">
                        <ImageWithFallback src={event.image} alt={event.title} fill sizes="44px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          {!selectedDate && `${event.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · `}
                          {formatEventTime(event.time) || 'Time TBA'}
                          {event.place && (
                            <>
                              <MapPin className="ml-1 h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{event.place}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
