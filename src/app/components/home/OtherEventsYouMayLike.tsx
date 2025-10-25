'use client';
import React from 'react';
import Image from 'next/image';
import { FaCalendar, FaMapMarkerAlt } from 'react-icons/fa';
import { useLatestEvents } from '@/hooks/useEvents';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/loader/Loader';
import { type Event } from '@/types/event';

const OtherEventsYouMayLike = () => {
  const { data: events, isLoading } = useLatestEvents();
  const router = useRouter();

  const handleViewDetails = (eventSlug: string) => {
    router.push(`/${eventSlug}`);
  };

  if (isLoading) return <Loader />;
  if (!events || events.length === 0) return null;

  // Take first 3 events for the grid layout
  const displayEvents = events.slice(0, 3);

  const getPriceDisplay = (event: Event) => {
    if (event.ticketType && event.ticketType.length > 0) {
      const firstTicket = event.ticketType[0];
      if (firstTicket.price === '0' || firstTicket.price === 'Free') {
        return 'Free';
      }
      return `₦${parseInt(firstTicket.price).toLocaleString()}`;
    }
    return 'Free';
  };

  const getStatusDisplay = (event: Event) => {
    if (event.ticketType && event.ticketType.length > 0) {
      const firstTicket = event.ticketType[0];
      if (firstTicket.sold >= firstTicket.quantity) {
        return 'Sold Out';
      }
    }
    return getPriceDisplay(event);
  };

  const formatEventDateTime = (date: string, time: string) => {
    const eventDate = new Date(date);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[eventDate.getDay()];
    const monthName = monthNames[eventDate.getMonth()];
    const day = eventDate.getDate();
    const hour = time ? time.split(':')[0] : '7';
    const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM';
    const displayHour = parseInt(hour) > 12 ? parseInt(hour) - 12 : parseInt(hour);
    
    return `${dayName}, ${monthName} ${day}${day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'}, ${displayHour}${ampm}`;
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Other Events You May Like
          </h2>
        </div>

        {/* Events Grid - Exact layout from image */}
        <div className="space-y-6">
          {/* First row - 2 events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayEvents.slice(0, 2).map((event, index) => (
              <div
                key={event.id || index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-300"
                onClick={() => event.slug && handleViewDetails(event.slug)}
              >
                <div className="flex lg:items-center ">
                  {/* Text Content - Left Side */}
                  <div className="flex-1 p-5">
                    {/* Event Title */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 leading-tight">
                      {event.title}
                    </h3>

                    {/* Event Details */}
                    <div className="space-y-3 mb-4">
                      {/* Date & Time */}
                      <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                        <FaCalendar className="text-gray-400 text-sm flex-shrink-0" />
                        <span className="text-sm truncate max-w-[100px] lg:max-w-52" title={formatEventDateTime(event.date, event.time)}>
                          {formatEventDateTime(event.date, event.time)}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                        <FaMapMarkerAlt className="text-gray-400 text-sm flex-shrink-0" />
                        <span className="text-sm truncate max-w-[100px] lg:max-w-52" title={event.location}>
                          {event.location}
                        </span>
                      </div>
                    </div>

                    {/* Price/Status */}
                    <div>
                      <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium rounded-full">
                        {getStatusDisplay(event)}
                      </span>
                    </div>
                  </div>

                  {/* Event Image - Right Side */}
                  <div className="relative w-32 h-32 m-4">
                    <Image
                      src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                      alt={event.title}
                      fill
                      className="object-cover"
                      style={{
                        borderRadius: '8px',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Second row - 1 event (left aligned) */}
          {displayEvents[2] && (
            <div className="flex justify-start">
              <div className="w-full lg:w-1/2">
                <div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-300"
                  onClick={() => displayEvents[2].slug && handleViewDetails(displayEvents[2].slug)}
                >
                  <div className="flex lg:items-center ">
                    {/* Text Content - Left Side */}
                    <div className="flex-1 p-5">
                      {/* Event Title */}
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 leading-tight">
                        {displayEvents[2].title}
                      </h3>

                      {/* Event Details */}
                      <div className="space-y-3 mb-4">
                        {/* Date & Time */}
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <FaCalendar className="text-gray-400 text-sm flex-shrink-0" />
                          <span className="text-sm truncate max-w-[100px] lg:max-w-52" title={formatEventDateTime(displayEvents[2].date, displayEvents[2].time)}>
                            {formatEventDateTime(displayEvents[2].date, displayEvents[2].time)}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                          <FaMapMarkerAlt className="text-gray-400 text-sm flex-shrink-0" />
                          <span className="text-sm truncate max-w-[100px] lg:max-w-52" title={displayEvents[2].location}>
                            {displayEvents[2].location}
                          </span>
                        </div>
                      </div>

                      {/* Price/Status */}
                      <div>
                        <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium rounded-full">
                          {getStatusDisplay(displayEvents[2])}
                        </span>
                      </div>
                    </div>

                    {/* Event Image - Right Side */}
                    <div className="relative w-32 h-32 m-4">
                      <Image
                        src={typeof displayEvents[2].image === 'string' ? displayEvents[2].image : '/placeholder.jpg'}
                        alt={displayEvents[2].title}
                        fill
                        className="object-cover"
                        style={{
                          borderRadius: '8px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OtherEventsYouMayLike;
