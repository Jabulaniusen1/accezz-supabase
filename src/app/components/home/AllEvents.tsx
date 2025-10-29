'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaTimes } from 'react-icons/fa';
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
    minPrice: '',
    maxPrice: '',
    searchTerm: '',
    startDate: '',
    endDate: '',
    eventType: ''
  });
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    searchTerm: '',
    startDate: '',
    endDate: '',
    eventType: ''
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);

  const handleViewDetails = (eventSlug: string) => {
    const link = `${window.location.origin}/${eventSlug}`;
    window.location.href = link;
  };

  const filteredEvents = (events || []).filter((event: Event) => {
    const lowestPrice = Math.min(...event.ticketType.map((ticket: TicketType) => parseFloat(ticket.price)));
    const eventDate = new Date(event.date);
    
    return (
      (!filters.location || event.location.toLowerCase().includes(filters.location.toLowerCase())) &&
      (!filters.minPrice || lowestPrice >= parseFloat(filters.minPrice)) &&
      (!filters.maxPrice || lowestPrice <= parseFloat(filters.maxPrice)) &&
      (!filters.searchTerm || event.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
      (!filters.startDate || eventDate >= new Date(filters.startDate)) &&
      (!filters.endDate || eventDate <= new Date(filters.endDate))
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

  const openLocationModal = () => {
    setTempFilters({ ...filters });
    setShowLocationModal(true);
  };

  const openPriceModal = () => {
    setTempFilters({ ...filters });
    setShowPriceModal(true);
  };

  const openDateModal = () => {
    setTempFilters({ ...filters });
    setShowDateModal(true);
  };

  const applyLocationFilter = () => {
    setFilters({ ...tempFilters });
    setShowLocationModal(false);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const applyPriceFilter = () => {
    setFilters({ ...tempFilters });
    setShowPriceModal(false);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const applyDateFilter = () => {
    setFilters({ ...tempFilters });
    setShowDateModal(false);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      minPrice: '',
      maxPrice: '',
      searchTerm: '',
      startDate: '',
      endDate: '',
      eventType: ''
    });
    setTempFilters({
      location: '',
      minPrice: '',
      maxPrice: '',
      searchTerm: '',
      startDate: '',
      endDate: '',
      eventType: ''
    });
    setCurrentPage(1); // Reset to first page when filters are cleared
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.location) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  };

  // Auto-scroll functionality
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const scrollContent = scrollContentRef.current;
    
    if (!scrollContainer || !scrollContent) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame
    const scrollDirection = 1; // 1 for right, -1 for left
    
    const autoScroll = () => {
      if (scrollContainer && scrollContent) {
        const maxScroll = scrollContent.scrollWidth - scrollContainer.clientWidth;
        
        if (maxScroll > 0) {
          scrollPosition += scrollSpeed * scrollDirection;
          
          // Reverse direction when reaching the end
          if (scrollPosition >= maxScroll) {
            scrollPosition = maxScroll;
            setTimeout(() => {
              scrollPosition = 0;
            }, 2000); // Pause for 2 seconds at the end
          }
          
          scrollContainer.scrollLeft = scrollPosition;
        }
      }
      
      requestAnimationFrame(autoScroll);
    };

    // Start auto-scroll after a short delay
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(autoScroll);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentEvents]);

  return (
    <>
      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          outline: none;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f54502;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f54502;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <section className="min-h-screen bg-white dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8" id="events">
        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      {/* Find an event in section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Find an event in:</h2>
          <div className="relative">
            <select 
              value={filters.location || 'Nigeria'}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="appearance-none bg-white border-2 border-gray-300 px-4 py-2 pr-8 text-gray-900 font-medium focus:outline-none focus:border-[#f54502] hover:border-gray-400 "
              style={{
                borderRadius: '10px'
              }}
            >
              <option value="Nigeria">Nigeria</option>
              <option value="Ghana">Ghana</option>
              <option value="Morocco">Morocco</option>
              <option value="Kenya">Kenya</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Horizontal scrolling event cards with auto-scroll */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto pb-4 scrollbar-hide" 
          id="auto-scroll-container"
        >
          <div 
            ref={scrollContentRef}
            className="flex gap-3 sm:gap-6 min-w-max" 
            id="scroll-content"
          >
            {currentEvents.slice(0, 5).map((event: Event, index: number) => (
              <div 
                key={event.id || index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-[#f54502]/50 min-w-[220px] max-w-[220px] sm:min-w-[300px] sm:max-w-[300px]"
                onClick={() => event.slug && handleViewDetails(event.slug)}
              >
                {/* Event Image with Overlay */}
                <div className="relative h-[280px] sm:h-[450px] w-full">
                  <Image
                    src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Darkened overlay with event details */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/60 to-transparent">
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
                      <span className="bg-[#f54502] text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 rounded-full">
                        FEATURED EVENT
                      </span>
                    </div>
                    
                    {/* Event details at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
                      <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <div className="flex items-center text-white/90">
                        <FaCalendarAlt className="text-white mr-2 flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm">{formatEventDate(event.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Header section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">All Events</h1>
          </div>
          
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={openLocationModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                filters.location 
                  ? 'bg-[#f54502] text-white border-[#f54502]' 
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              style={{
                borderRadius: '10px'
              }}
            >
              {filters.location || 'Location'}
              {getActiveFilterCount() > 0 && filters.location && (
                <span className="bg-white text-[#f54502] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {getActiveFilterCount()}
                </span>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button 
              onClick={openPriceModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                filters.minPrice || filters.maxPrice
                  ? 'bg-[#f54502] text-white border-[#f54502]' 
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              style={{
                borderRadius: '10px'
              }}
            >
              Price
              {getActiveFilterCount() > 0 && (filters.minPrice || filters.maxPrice) && (
                <span className="bg-white text-[#f54502] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {getActiveFilterCount()}
                </span>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button 
              onClick={openDateModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                filters.startDate || filters.endDate
                  ? 'bg-[#f54502] text-white border-[#f54502]' 
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              style={{
                borderRadius: '10px'
              }}
            >
              Date
              {getActiveFilterCount() > 0 && (filters.startDate || filters.endDate) && (
                <span className="bg-white text-[#f54502] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {getActiveFilterCount()}
                </span>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {getActiveFilterCount() > 0 && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-400"
                style={{
                  borderRadius: '10px'
                }}
              >
                Clear All
              </button>
            )}
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
                  
                  <div className="flex-shrink-0 w-36 h-36 object-cover">
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
        )}

        {/* No results message */}
        {!isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-6">🔍</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">No events found</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Try adjusting your search filters to find what you&apos;re looking for.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="max-w-7xl mx-auto mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-[#f54502] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-[#f54502]'
            }`}
            style={{ borderRadius: '10px' }}
          >
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#f54502] text-white border-2 border-[#f54502]'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-[#f54502] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-[#f54502]'
                  }`}
                  style={{ borderRadius: '10px' }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-[#f54502] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-[#f54502]'
            }`}
            style={{ borderRadius: '10px' }}
          >
            Next
          </button>
        </div>
      )}

      {/* Location Filter Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-xl max-w-md w-full border-2 border-gray-200" style={{
            borderRadius: '10px'
          }}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Location</h3>
              <button 
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {['All Countries', 'Nigeria', 'Ghana', 'Morocco', 'Kenya'].map((country) => (
                  <div key={country} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-900">{country}</span>
                    <button
                      onClick={() => setTempFilters({ ...tempFilters, location: country === 'All Countries' ? '' : country })}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        tempFilters.location === country || (country === 'All Countries' && !tempFilters.location)
                          ? 'border-[#f54502] bg-[#f54502]'
                          : 'border-gray-300'
                      }`}
                      style={{
                        borderRadius: '10px'
                      }}
                    >
                      {(tempFilters.location === country || (country === 'All Countries' && !tempFilters.location)) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setTempFilters({ ...tempFilters, location: '' })}
                  className="flex-1 py-2 px-4 text-gray-700 font-medium"
                  style={{
                    borderRadius: '10px'
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={applyLocationFilter}
                  className="flex-1 py-2 px-4 bg-[#f54502] text-white rounded-lg font-medium"
                  style={{
                    borderRadius: '10px'
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Filter Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-xl max-w-md w-full border-2 border-gray-200" style={{
            borderRadius: '10px'
          }}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Price</h3>
              <button 
                onClick={() => setShowPriceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <input
                  type="range"
                  min="0"
                  max="100000"
                  value={tempFilters.maxPrice || '100000'}
                  onChange={(e) => setTempFilters({ ...tempFilters, maxPrice: e.target.value })}
                  className="w-full h-2 bg-gray-200 appearance-none cursor-pointer slider"
                  style={{
                    borderRadius: '10px',
                    background: `linear-gradient(to right, #f54502 0%, #f54502 ${((parseInt(tempFilters.maxPrice || '100000') / 100000) * 100)}%, #e5e7eb ${((parseInt(tempFilters.maxPrice || '100000') / 100000) * 100)}%, #e5e7eb 100%)`
                  }}
                />
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-2">Minimum amount</label>
                  <input
                    type="number"
                    value={tempFilters.minPrice}
                    onChange={(e) => setTempFilters({ ...tempFilters, minPrice: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502]"
                    style={{
                      borderRadius: '10px'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-2">Maximum amount</label>
                  <input
                    type="number"
                    value={tempFilters.maxPrice}
                    onChange={(e) => setTempFilters({ ...tempFilters, maxPrice: e.target.value })}
                    placeholder="100000"
                    className="w-full px-3 py-2 border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502]"
                    style={{
                      borderRadius: '10px'
                    }}
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setTempFilters({ ...tempFilters, minPrice: '', maxPrice: '' })}
                  className="flex-1 py-2 px-4 text-gray-700 font-medium"
                  style={{
                    borderRadius: '10px'
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={applyPriceFilter}
                  className="flex-1 py-2 px-4 bg-[#f54502] text-white rounded-lg font-medium"
                  style={{
                    borderRadius: '10px'
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Filter Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-gray-200" style={{
            borderRadius: '10px'
          }}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Date</h3>
              <button 
                onClick={() => setShowDateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setTempFilters({ ...tempFilters, startDate: today, endDate: today });
                    }}
                    className="flex-1 py-2 px-4 border-2 border-gray-300 text-sm font-medium hover:bg-gray-50 hover:border-gray-400"
                    style={{
                      borderRadius: '10px'
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowStr = tomorrow.toISOString().split('T')[0];
                      setTempFilters({ ...tempFilters, startDate: tomorrowStr, endDate: tomorrowStr });
                    }}
                    className="flex-1 py-2 px-4 border-2 border-gray-300 text-sm font-medium hover:bg-gray-50 hover:border-gray-400"
                    style={{
                      borderRadius: '10px'
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const weekend = new Date();
                      weekend.setDate(today.getDate() + (6 - today.getDay()));
                      const nextWeekend = new Date(weekend);
                      nextWeekend.setDate(weekend.getDate() + 1);
                      setTempFilters({ 
                        ...tempFilters, 
                        startDate: weekend.toISOString().split('T')[0], 
                        endDate: nextWeekend.toISOString().split('T')[0] 
                      });
                    }}
                    className="flex-1 py-2 px-4 border-2 border-gray-300 text-sm font-medium hover:bg-gray-50 hover:border-gray-400"
                    style={{
                      borderRadius: '10px'
                    }}
                  >
                    This weekend
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Start Date</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={tempFilters.startDate}
                        onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502]"
                        style={{
                          borderRadius: '10px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-center text-gray-500">to</div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">End Date</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={tempFilters.endDate}
                        onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502]"
                        style={{
                          borderRadius: '10px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setTempFilters({ ...tempFilters, startDate: '', endDate: '' })}
                  className="flex-1 py-2 px-4 text-gray-700 font-medium"
                  style={{
                    borderRadius: '10px'
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={applyDateFilter}
                  className="flex-1 py-2 px-4 bg-[#f54502] text-white rounded-lg font-medium"
                  style={{
                    borderRadius: '10px'
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  );
};

export default AllEvents;