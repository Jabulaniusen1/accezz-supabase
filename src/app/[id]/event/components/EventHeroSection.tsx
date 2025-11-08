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
  showMap?: boolean;
  virtualPlatformLabel?: string;
}

export const EventHeroSection = ({
  event,
  scrollToTickets,
  showMap = true,
  virtualPlatformLabel,
}: EventHeroSectionProps) => {
  const locationSummary = [event.venue, event.location].filter(Boolean).join(', ');
  const mapQuery = locationSummary || event.location || event.venue || event.title;
  return (
    <div className="bg-white dark:bg-gray-800 py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:items-start">
          {/* Image Section - Left Side - Sticky */}
          <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start space-y-6">
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
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
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#f54502]/20 to-[#d63a02]/20 flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
              )}
            </div>
            
            {/* CTA Button - Hidden on mobile, shown on desktop */}
            <button
              className="hidden lg:block w-full px-8 py-4 bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white text-lg font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              style={{ borderRadius: '5px' }}
              onClick={scrollToTickets}
            >
              Get Your Ticket Now
            </button>
          </div>

          {/* Content Section - Right Side - Scrollable */}
          <div className="lg:col-span-3 space-y-8">
            {event ? (
              <div className="space-y-8">
                {/* Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                    {event.title}
                  </h1>
                  <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-[#f54502] to-[#d63a02] rounded-full"></div>
                </div>

                {/* Event Details Card */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Date */}
                  <div className="flex items-center space-x-3 sm:space-x-4 text-gray-700 dark:text-gray-300">
                    <div className="p-1.5 sm:p-2 bg-[#f54502]/10 rounded-xl">
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#f54502]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Date</p>
                      <p className="text-sm sm:text-base font-semibold">{formatEventDate(event.date)}</p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center space-x-3 sm:space-x-4 text-gray-700 dark:text-gray-300">
                    <div className="p-1.5 sm:p-2 bg-[#f54502]/10 rounded-xl">
                      <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#f54502]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Time</p>
                      <p className="text-sm sm:text-base font-semibold">{formatEventTime(event.time)}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start space-x-3 sm:space-x-4 text-gray-700 dark:text-gray-300">
                    <div className="p-1.5 sm:p-2 bg-[#f54502]/10 rounded-xl mt-0.5">
                      <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#f54502]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {showMap ? 'Location' : 'Hosted on'}
                      </p>
                      <p className="text-sm sm:text-base font-semibold">
                        {showMap
                          ? locationSummary || 'Location to be announced'
                          : virtualPlatformLabel || 'Online event'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    About this event
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base lg:text-lg">
                    {event.description}
                  </p>
                </div>

                {/* Simple Map Section */}
                {showMap && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Location
                    </h4>
                    <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden">
                      <iframe
                        src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                        className="w-full h-full"
                        loading="lazy"
                        title="Event Location Map"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Social Media Links */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Follow & Share</h4>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {event?.socialMediaLinks?.instagram && (
                      <a
                        href={event.socialMediaLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 sm:p-3 bg-gradient-to-r from-[#f54502]/10 to-[#d63a02]/10 hover:from-[#f54502]/20 hover:to-[#d63a02]/20 rounded-xl hover:scale-105 transition-all"
                      >
                        <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-[#f54502]" />
                      </a>
                    )}
                    {event?.socialMediaLinks?.twitter && (
                      <a
                        href={event.socialMediaLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 sm:p-3 bg-gradient-to-r from-[#f54502]/10 to-[#d63a02]/10 hover:from-[#f54502]/20 hover:to-[#d63a02]/20 rounded-xl hover:scale-105 transition-all"
                      >
                        <XIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#f54502]" />
                      </a>
                    )}
                    {event?.socialMediaLinks?.facebook && (
                      <a
                        href={event.socialMediaLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 sm:p-3 bg-gradient-to-r from-[#f54502]/10 to-[#d63a02]/10 hover:from-[#f54502]/20 hover:to-[#d63a02]/20 rounded-xl hover:scale-105 transition-all"
                      >
                        <Facebook className="w-5 h-5 sm:w-6 sm:h-6 text-[#f54502]" />
                      </a>
                    )}
                  </div>
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
      
      {/* Mobile Sticky Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <button
          className="w-full px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white text-base font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          style={{ borderRadius: '5px' }}
          onClick={scrollToTickets}
        >
          Get Your Ticket Now
        </button>
      </div>
    </div>
  );
};