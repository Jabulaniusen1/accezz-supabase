'use client';
import React, { useState } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import Image from 'next/image';
import { useAllEvents } from '@/hooks/useEvents';
import { formatPrice } from '@/utils/formatPrice';
import { formatEventDate } from '@/utils/formatDateTime';
import Toast from '@/components/ui/Toast';

interface TicketType {
  name: string;
  price: string;
  quantity: string;
  sold: string;
}

interface Event {
  id?: string;
  title: string;
  slug?: string;
  description: string;
  image: string | File | null;
  date: string;
  location: string;
  ticketType: TicketType[];
}

const AllEvents = () => {
  const { data: events, isLoading } = useAllEvents();
  const [filters, setFilters] = useState({
    location: '',
    maxPrice: '',
    searchTerm: '',
    date: ''
  });
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;

  const handleViewDetails = (eventSlug: string) => {
    const link = `${window.location.origin}/${eventSlug}`;
    window.location.href = link;
  };

  const filteredEvents = (events || []).filter((event: Event) => {
    const lowestPrice = Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price)));
    const eventDate = new Date(event.date);
    
    return (
      (!filters.location || event.location.toLowerCase().includes(filters.location.toLowerCase())) &&
      (!filters.maxPrice || lowestPrice <= parseFloat(filters.maxPrice)) &&
      (!filters.searchTerm || event.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
      (!filters.date || eventDate >= new Date(filters.date))
    );
  });

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen bg-white dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8" id="events">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      {/* Header section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">All Events</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">{filteredEvents.length} events</p>
          </div>
          
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium">
              Nigeria
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              Price
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white text-black border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              Date
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>


      {/* Events grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentEvents.map((event: Event) => (
              <div 
                key={event.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-[#f54502]/30"
                onClick={() => event.slug && handleViewDetails(event.slug)}
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 hover:text-[#f54502] transition-colors">{event.title}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <FaCalendarAlt className="text-[#f54502] mr-2 flex-shrink-0" />
                        <span className="text-sm">{formatEventDate(event.date)}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <FaMapMarkerAlt className="text-[#f54502] mr-2 flex-shrink-0" />
                        <span className="text-sm truncate">{event.location}</span>
                      </div>
                    </div>
                    
                    <div className="text-[#f54502] font-semibold text-lg">
                      {Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price))) === 0 
                        ? 'Free' 
                        : formatPrice(Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price))), '₦')
                      }
                    </div>
                  </div>
                  
                  <div className="w-24 h-24 flex-shrink-0">
                    <Image
                      src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                      alt={event.title}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {!isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-6">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No events found</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Try adjusting your search filters to find what you&apos;re looking for.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredEvents.length > eventsPerPage && (
        <div className="max-w-7xl mx-auto mt-12 flex flex-col items-center">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 font-semibold ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                  : 'bg-white text-[#f54502] hover:bg-[#f54502]/10 dark:bg-gray-800 dark:text-[#f54502] dark:hover:bg-gray-700'
              }`}
            >
              &lt;
            </button>

            {[...Array(totalPages)].map((_, index: number) => {
              const pageNumber = index + 1;
              const isCurrent = pageNumber === currentPage;
              const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1;
              const isFirstOrLast = pageNumber === 1 || pageNumber === totalPages;

              if (!isNearCurrent && !isFirstOrLast) {
                if (pageNumber === 2 || pageNumber === totalPages - 1) {
                  return <span key={index} className="text-gray-500 px-2">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={index}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 font-semibold ${
                    isCurrent
                      ? 'bg-[#f54502] text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 font-semibold ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                  : 'bg-white text-[#f54502] hover:bg-[#f54502]/10 dark:bg-gray-800 dark:text-[#f54502] dark:hover:bg-gray-700'
              }`}
            >
              &gt;
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Showing {indexOfFirstEvent + 1}-{Math.min(indexOfLastEvent, filteredEvents.length)} of {filteredEvents.length} events
          </div>
        </div>
      )}
    </section>
  );
};

export default AllEvents;