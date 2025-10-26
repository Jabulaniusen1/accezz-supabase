'use client';
import React from 'react';
import Image from 'next/image';
import { FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { useLatestEvents } from '@/hooks/useEvents';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/loader/Loader';
import { formatPrice } from '@/utils/formatPrice';
import { formatEventDate } from '@/utils/formatDateTime';
import { type Event } from '@/types/event';

interface TicketType {
  name: string;
  price: string;
  quantity: string;
  sold: string;
}

const OtherEventsYouMayLike = () => {
  const { data: events, isLoading } = useLatestEvents();
  const router = useRouter();

  const handleViewDetails = (eventSlug: string) => {
    router.push(`/${eventSlug}`);
  };

  if (isLoading) return <Loader />;
  if (!events || events.length === 0) return null;

  // Take first 6 events for the grid layout
  const displayEvents = events.slice(0, 6);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Other Events You May Like
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Discover more amazing events
          </p>
        </div>

        {/* Events Grid - Matching AllEvents style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayEvents.map((event: Event, index: number) => (
            <div 
              key={event.id || index} 
              className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-[#f54502]/50 overflow-hidden"
              onClick={() => event.slug && handleViewDetails(event.slug)}
              style={{
                borderRadius: '10px'
              }}
            >
              <div className="flex gap-4 h-full min-w-0">
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 hover:text-[#f54502] transition-colors line-clamp-2 min-w-0">{event.title}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <FaCalendarAlt className="mr-2 flex-shrink-0" />
                        <span className="text-sm">{formatEventDate(event.date)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 dark:text-gray-400 min-w-0">
                        <FaMapMarkerAlt className="mr-2 flex-shrink-0" />
                        <span className="text-sm truncate flex-1 min-w-0">{event.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[#f54502] font-semibold text-lg">
                    {Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price))) === 0 
                      ? 'Free' 
                      : formatPrice(Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price))), '₦')
                    }
                  </div>
                </div>
                
                <div className="flex-shrink-0 w-36 h-36 object-cover border border-gray-200 dark:border-gray-600">
                  <Image
                    src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                    alt={event.title}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    style={{
                      borderRadius: '5px'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OtherEventsYouMayLike;
