'use client';
import React, { useState } from 'react';
import { FaFire, FaClock, FaArrowRight } from 'react-icons/fa';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/utils/formatPrice';
import { formatEventDate } from '@/utils/formatDateTime';
import { motion } from 'framer-motion';
import { useTrendingEvents } from '@/hooks/useEvents';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { TrendingEvent } from '@/types/event';

const Trending = () => {
  const { data: trendingEvents, isLoading } = useTrendingEvents();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const calculateSoldPercentage = (event: TrendingEvent) => {
    const totalSold = event.ticketType.reduce((acc, ticket) => acc + parseInt(ticket.sold), 0);
    const totalQuantity = event.ticketType.reduce((acc, ticket) => acc + parseInt(ticket.quantity), 0);
    return Math.round((totalSold / totalQuantity) * 100);
  };

  const getTicket = async (slug: string) => {
    try {
      setNavigating(true);
      await router.push(`/${slug}`);
    } finally {
      setNavigating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <section className="relative py-20 bg-white dark:bg-gray-950 overflow-hidden" id='trending'>
      {navigating && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>}
      
      {/* Abstract background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-orange-50/30 to-transparent dark:from-orange-950/10"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-t from-blue-50/20 to-transparent dark:from-blue-950/10"></div>
        
        {/* Floating fire icons */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -15, 0],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute text-orange-400/30 dark:text-orange-600/20 text-4xl ${i === 0 ? 'top-1/4 left-1/4' : i === 1 ? 'top-1/3 right-1/4' : 'bottom-1/4 left-1/3'}`}
          >
            <FaFire />
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with diagonal underline */}
        <div className="flex flex-col items-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="relative">
              <FaFire className="text-4xl text-orange-500 animate-pulse" />
              <div className="absolute -inset-2 bg-orange-500/20 rounded-full -z-10"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              <span className="relative inline-block">
                <span className="relative z-10">Hot Tickets</span>
                <span className="absolute bottom-2 left-0 w-full h-3 bg-orange-200/60 dark:bg-orange-900/40 -z-0 rotate-1"></span>
              </span>
            </h2>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl text-center"
          >
            Events selling fast - secure your spot before they&apos;re gone
          </motion.p>
        </div>

        {/* Events grid - staggered layout */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-[400px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {(trendingEvents || []).map((event, index) => {
              const isOdd = index % 2 !== 0;
              const soldPercentage = calculateSoldPercentage(event);
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative group ${isOdd ? 'md:transform md:translate-y-8' : ''}`}
                >
                  {/* Hot ticket badge */}
                  <div className="absolute -top-3 -right-3 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 rounded-full 
                                flex items-center gap-2 text-sm font-bold shadow-lg">
                    <FaFire className="text-white animate-pulse" />
                    <span>{soldPercentage}% Sold</span>
                  </div>
                  
                  {/* Card with gradient border */}
                  <div className="relative h-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg 
                                 border border-gray-200 dark:border-gray-800 group-hover:shadow-xl transition-all duration-300">
                    {/* Image with hover zoom */}
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10"></div>
                      <Image
                        src={typeof event.image === 'string' ? event.image : '/placeholder.jpg'}
                        alt={event.title}
                        fill
                        className="object-cover transform transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                          {event.title}
                        </h3>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {formatPrice(Math.min(...event.ticketType.map(t => parseFloat(t.price))), "₦")}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {event.description}
                      </p>

                      {/* Date and progress bar */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
                          <FaClock className="text-blue-500" />
                          <span>{formatEventDate(event.date)}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{soldPercentage}% sold</span>
                            <span>Hurry!</span>
                          </div>
                          <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500"
                              style={{ width: `${soldPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action button */}
                      <button 
                        onClick={() => event.slug && getTicket(event.slug)}
                        disabled={navigating}
                        className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg 
                                  hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg
                                  flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {navigating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Securing...</span>
                          </>
                        ) : (
                          <>
                            <span>Get Tickets</span>
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Trending;