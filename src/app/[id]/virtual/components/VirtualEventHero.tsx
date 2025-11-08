import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { type Event } from '@/types/event';
import { FaCalendarAlt, FaClock, FaUserAlt, FaVideo } from 'react-icons/fa';
import { formatEventDate, formatEventTime } from '@/utils/formatDateTime';


interface VirtualEventHeroProps {
  event: Event;
}


export default function VirtualEventHero({ event }: VirtualEventHeroProps) {

  return (
    <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start mb-8 sm:mb-12">
      {/* TEXT CONTENT - ALWAYS TAKES FULL WIDTH ON MOBILE */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:flex-1 order-2 lg:order-1"
      >
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4 shadow-sm">
          <FaVideo className="mr-2" />
          <span className="font-semibold tracking-wide text-xs sm:text-sm">VIRTUAL EVENT</span>
        </div>

        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-purple-600 to-blue-400 bg-clip-text text-transparent mb-3 sm:mb-4 leading-tight">
          {event.title}
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 max-w-xl">
          {event.description.substring(0, 200)}...
        </p>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg shadow-sm">
            <FaCalendarAlt className="text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">DATE</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                {formatEventDate(event?.date || '')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg shadow-sm">
            <FaClock className="text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">TIME</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
               {formatEventTime(event?.time || '')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg shadow-sm">
            <FaUserAlt className="text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">HOST</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">{event.hostName}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* IMAGE - NOW VISIBLE ON ALL SCREEN SIZES */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-auto lg:flex-1 order-1 lg:order-2 relative aspect-video min-h-[200px] lg:h-96 rounded-2xl overflow-hidden shadow-xl"
      >
        {event.image && (
          <Image
            src={typeof event.image === 'string' ? event.image : URL.createObjectURL(event.image)}
            alt={event.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </motion.div>
    </div>
  );
}