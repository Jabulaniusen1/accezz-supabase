import React from 'react';
import Image from 'next/image';
import { type Event } from '@/types/event';
import { Facebook, Instagram } from '@mui/icons-material';  
import XIcon from '@mui/icons-material/X';
import { formatEventTime, formatEventDate } from '@/utils/formatDateTime';
import { ClockIcon, MapPinIcon, CalendarIcon } from 'lucide-react';

interface EventHeroSectionProps {
  event: Event;
  scrollToTickets: () => void;
}

export const EventHeroSection = ({ event, scrollToTickets }: EventHeroSectionProps) => {
  return (
    <div className="pb-8  md:pb-12 lg:px-16 lg:pb-16">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12 px-4 lg:px-36 mx-auto">
        {/* Image Section - Left Side */}
        <div className="lg:w-[35%] w-full flex flex-col gap-6">
          <div className="relative w-full h-[430px] rounded-xl overflow-hidden">
            {event && event.image ? (
              <Image
                src={typeof event.image === 'string' ? event.image : URL.createObjectURL(event.image)}
                alt={event.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 flex items-center justify-center">
                <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            )}
          </div>
          {/* CTA Button */}
          <button
            className="w-full sm:w-auto px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-lg transition-colors"
            style={{
              borderRadius: '5px',
            }}
            onClick={scrollToTickets}
          >
            Get a Ticket
          </button>
        </div>

        {/* Content Section - Right Side */}
        <div className=" space-y-6 lg:w-7/12">
          {event ? (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {event.title}
                </h1>
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                {/* Date */}
                <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                  <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="lg:text-base text-sm">{formatEventDate(event.date)}</span>
                </div>

                {/* Time */}
                <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                  <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="lg:text-base text-sm">{formatEventTime(event.time)}</span>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-3 text-gray-700 dark:text-gray-300">
                  <MapPinIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="lg:text-base text-sm">{event.venue}, {event.location}</span>
                </div>
              </div>

              <hr className="border-gray-300 dark:border-gray-700 w-full"/>

              {/* About Section */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  About this event
                </h3>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed lg:text-base text-sm">
                  {event.description}
                </p>
              </div>

              {/* Venue Section */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Venue</h4>
                <p className="text-gray-700 dark:text-gray-200 lg:text-base text-sm">{event.venue}</p>
              </div>

              {/* Social Media Links */}
              <div className="flex items-center gap-3">
                {event?.socialMediaLinks?.instagram && (
                  <a
                    href={event.socialMediaLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 dark:bg-white/5 bg-blue-50 rounded-full hover:scale-105 transition-transform"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {event?.socialMediaLinks?.twitter && (
                  <a
                    href={event.socialMediaLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 dark:bg-white/5 bg-blue-50 rounded-full hover:scale-105 transition-transform"
                  >
                    <XIcon className="w-4 h-4" />
                  </a>
                )}
                {event?.socialMediaLinks?.facebook && (
                  <a
                    href={event.socialMediaLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 dark:bg-white/5 bg-blue-50 rounded-full hover:scale-105 transition-transform"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};