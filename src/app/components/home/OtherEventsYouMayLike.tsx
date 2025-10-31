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
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-[#f54502] font-semibold text-sm uppercase tracking-wider">Discover More</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Other Events You May Like
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Explore curated events tailored just for you
          </p>
        </div>

        {/* Events Grid - Modern Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayEvents.map((event: Event, index: number) => {
            const minPrice = Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price)));
            const isFree = minPrice === 0;
            
            return (
              <div 
                key={event.id || index} 
                className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-[#f54502]/30 transform hover:-translate-y-2"
                onClick={() => event.slug && handleViewDetails(event.slug)}
              >
                {/* Image Container */}
                <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <Image
                    src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                    alt={event.title}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Price Badge */}
                  <div className="absolute top-4 right-4">
                    <div className={`px-4 py-2 rounded-full backdrop-blur-sm font-bold text-sm ${
                      isFree 
                        ? 'bg-green-500/90 text-white' 
                        : 'bg-[#f54502]/90 text-white'
                    }`}>
                      {isFree ? 'FREE' : formatPrice(minPrice, '₦')}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 group-hover:text-[#f54502] transition-colors">
                    {event.title}
                  </h3>
                  
                  {/* Event Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="p-2 bg-[#f54502]/10 dark:bg-[#f54502]/20"
                        style={{
                          borderRadius: '5px'
                        }}
                        >
                          <FaCalendarAlt className="w-4 h-4 text-[#f54502]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {formatEventDate(event.date)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="p-2 bg-[#f54502]/10 dark:bg-[#f54502]/20"
                        style={{
                          borderRadius: '5px'
                        }}
                        >
                          <FaMapMarkerAlt className="w-4 h-4 text-[#f54502]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 line-clamp-2">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#f54502] group-hover:underline">
                        View Details
                      </span>
                      <svg 
                        className="w-5 h-5 text-[#f54502] transform group-hover:translate-x-1 transition-transform" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OtherEventsYouMayLike;
