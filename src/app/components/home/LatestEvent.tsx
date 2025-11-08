'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { FaCalendar, FaMapMarkerAlt, FaUser, FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useLatestEvents } from '@/hooks/useEvents';
import { formatEventDate } from '@/utils/formatDateTime';
import Toast from '@/components/ui/Toast';
import Loader from '@/components/ui/loader/Loader';

const LatestEvent = () => {
  const { data: events, isLoading } = useLatestEvents();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const handleNext = useCallback(() => {
    if (isTransitioning || !events) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % events.length);
      setIsTransitioning(false);
    }, 200);
  }, [isTransitioning, events]);

  // Auto-rotation effect
  useEffect(() => {
    if (!events || events.length <= 1) return;
    
    const interval = setInterval(() => {
      handleNext();
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [events, handleNext]);

  const handlePrevious = () => {
    if (isTransitioning || !events) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + events.length) % events.length);
      setIsTransitioning(false);
    }, 200);
  };

  const handleViewDetails = (eventSlug: string) => {
    const link = `${window.location.origin}/${eventSlug}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) return <Loader />;
  if (!events || events.length === 0) return null;

  const currentEvent = events[currentIndex];

  return (
    <section className="relative py-12 md:py-20 overflow-hidden bg-white bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 dark:bg-gray-950" id='latestEvents'>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Simplified background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/20 dark:to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-t from-purple-50/20 to-transparent dark:from-purple-950/10 dark:to-transparent"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-16 gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <span className="inline-block px-2 md:px-3 py-1 text-xs font-medium tracking-wider text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/30 rounded-full">
              Featured Events
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              <span className="relative inline-block">
                <span className="relative z-10">Best Experiences</span>
                <span className="absolute bottom-1 md:bottom-2 left-0 w-full h-2 md:h-3 bg-blue-200/60 dark:bg-blue-900/40 -z-0"></span>
              </span>
            </h2>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <button
              onClick={handlePrevious}
              className="p-2 md:p-3 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-colors"
              aria-label="Previous event"
            >
              <FaChevronLeft className="text-blue-600 dark:text-blue-400 text-sm md:text-base" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 md:p-3 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-colors"
              aria-label="Next event"
            >
              <FaChevronRight className="text-blue-600 dark:text-blue-400 text-sm md:text-base" />
            </button>
          </div>
        </div>

        {/* Content layout */}
        <div 
          key={currentIndex} 
          className={`relative ${isTransitioning ? 'animate-slideOut' : 'animate-slideIn'}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 md:gap-8 items-center">
            {/* Content */}
            <div className="relative z-10">
              <div className="space-y-4 md:space-y-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 md:p-8 rounded-xl md:rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <span className="px-2 md:px-3 py-1 text-xs md:text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full w-fit">
                    Featured
                  </span>
                  {/* <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {formatEventDate(currentEvent.date)}
                  </span> */}
                </div>
                
                <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                  {currentEvent.title}
                </h3>
                
                {/* <p className="text-gray-600 dark:text-gray-300 text-sm md:text-lg line-clamp-3 md:line-clamp-none">
                  {currentEvent.description}
                </p> */}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {/* <div className="flex items-center space-x-2 md:space-x-3 text-gray-700 dark:text-gray-300 text-sm md:text-base">
                    <FaClock className="text-blue-500 text-sm md:text-base" />
                    <span>{formatEventTime(currentEvent.time)}</span>
                  </div> */}
                  <div className="flex items-center space-x-2 md:space-x-3 text-gray-700 dark:text-gray-300 text-sm md:text-base">
                    <FaMapMarkerAlt className="text-blue-500 text-sm md:text-base" />
                    <span className="truncate">{currentEvent.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-3 text-gray-700 dark:text-gray-300 text-sm md:text-base sm:col-span-2">
                    <FaUser className="text-blue-500 text-sm md:text-base" />
                    <span>{currentEvent.hostName}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => currentEvent.slug && handleViewDetails(currentEvent.slug)}
                  className="inline-flex items-center justify-center px-4 md:px-6 py-2 md:py-2.5 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors duration-200 text-sm md:text-base"
                >
                  <span className="flex items-center">
                    Explore Event
                    <FaArrowRight className="ml-2 text-sm" />
                  </span>
                </button>
              </div>
            </div>
            
            {/* Image */}
            <div className="relative h-[250px] md:h-[400px] lg:h-[500px] rounded-xl md:rounded-2xl overflow-hidden shadow-lg md:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 dark:to-black/50 z-10"></div>
              <Image
                src={typeof currentEvent.image === 'string' ? currentEvent.image : '/placeholder.jpg'}
                alt={currentEvent.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute bottom-3 md:bottom-6 left-3 md:left-6 right-3 md:right-6 z-20">
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 md:p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                    <FaCalendar className="text-sm md:text-base" />
                    <span className="font-medium text-sm md:text-base">{formatEventDate(currentEvent?.date || '')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestEvent;