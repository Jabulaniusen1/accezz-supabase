// components/EventTicketsSection.tsx
import React, { forwardRef } from 'react';
import Image from 'next/image';
import { CheckCircleIcon } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { type Event } from '@/types/event';
import { type Ticket } from '@/types/event';

interface EventTicketsSectionProps {
    event: Event;
    eventSlug: string;
    handleGetTicket: (ticket: Ticket) => void;
  }

export const EventTicketsSection = forwardRef<HTMLDivElement, EventTicketsSectionProps>(
    ({ event, eventSlug, handleGetTicket }, ref) => {
      return (
        <div 
          ref={ref} 
          className="bg-gray-50 dark:bg-gray-800 py-8 sm:py-12 lg:py-16"
        >
            <div className="mx-auto lg:px-32 px-4 sm:px-6">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                        Available Tickets
                    </h2>
                    <div className="w-16 sm:w-20 lg:w-24 h-1 bg-gradient-to-r from-[#f54502] to-[#d63a02] rounded-full mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg">
                        Choose your preferred ticket type and secure your spot
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {event?.ticketType.map((ticket, index) => (
                    <div key={index} className="w-full">
                        <div className={`
                            relative p-4 sm:p-6 lg:p-8 rounded-2xl 
                            bg-white dark:bg-gray-800
                            border-2 border-gray-200 dark:border-gray-700
                            transition-all duration-300
                            hover:shadow-2xl hover:-translate-y-2 hover:border-[#f54502]/30
                            ${parseInt(ticket.quantity) === 0 ? 'opacity-75 grayscale' : ''}
                        `}>
                        {/* Ticket Header */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#f54502] to-[#d63a02] bg-clip-text text-transparent">
                                {ticket.name}
                                </h3>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 sm:mt-2 text-gray-900 dark:text-white">
                                {formatPrice(parseFloat(ticket.price), '₦')}
                                </p>
                            </div>
                            
                            {/* QR Code */}
                            <div className="relative group">
                                <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                `${window.location.origin}/events/${eventSlug}#tickets`
                                )}&format=png&qzone=2&color=6366F1`}
                                alt={`QR Code for ${ticket.name}`}
                                width={50}
                                height={50}
                                className="rounded-lg shadow-md transition-all duration-300 
                                group-hover:scale-150 group-hover:shadow-xl 
                                bg-white p-1 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16"
                                priority
                                />
                                <div className="absolute -bottom-6 right-0 text-xs bg-gray-800 text-white 
                                px-2 py-1 rounded opacity-0 group-hover:opacity-100 
                                transition-opacity duration-300 whitespace-nowrap">
                                <span className="block">Scan to view ticket</span>
                                <span className="block text-[10px] text-gray-300">{ticket.name}</span>
                                </div>
                            </div>
                            </div>

                            {/* Status Indicators */}
                            {parseInt(ticket.quantity) === 0 && (
                            <div className="absolute -rotate-12 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <div className="border-2 sm:border-4 border-red-500 text-red-500 px-2 sm:px-4 py-1 text-sm sm:text-lg font-bold rounded-lg">
                                SOLD OUT
                                </div>
                            </div>
                            )}
                            
                            
                            {parseInt(ticket.quantity) > 0 && parseInt(ticket.quantity) <= 3 && (
                            <div className="absolute -left-6 sm:-left-8 -top-6 sm:-top-8 z-20">
                                <span className="inline-flex items-center bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full shadow-lg whitespace-nowrap transform -rotate-10">
                                <span className="mr-1">🔥</span>
                                Only {ticket.quantity} left!
                                </span>
                            </div>
                            )}

                            {/* Ticket Details */}
                            <div className="mt-4 sm:mt-6 space-y-1.5 sm:space-y-2 lg:space-y-3">
                            {ticket.details ? (
                                ticket.details.split('\n').map((detail, idx) => (
                                <div key={idx} className="flex items-start space-x-2 sm:space-x-3">
                                    <CheckCircleIcon className="text-green-500 w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{detail}</span>
                                </div>
                                ))
                            ) : (
                                <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <CheckCircleIcon className="text-green-500 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Standard Event Entry</span>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <CheckCircleIcon className="text-green-500 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Access to Main Area</span>
                                </div>
                                </div>
                            )}
                            </div>

                            {/* Purchase Button */}
                            <button
                            disabled={parseInt(ticket.quantity) === 0}
                            onClick={() => handleGetTicket(ticket)}
                            style={{ borderRadius: '5px' }}
                            className={`
                                w-full mt-4 sm:mt-6 py-3 sm:py-4 px-4 sm:px-6 text-white font-semibold text-sm sm:text-base lg:text-lg
                                transition-all duration-300 transform
                                ${parseInt(ticket.quantity) === 0 
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                                    : 'bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 hover:shadow-xl hover:scale-105'
                                }
                            `}
                            >
                            {parseInt(ticket.quantity) === 0 ? 'Sold Out' : 'Get Ticket Now'}
                            </button>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-gray-100 dark:bg-gray-700 rounded-r-full"></div>
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-gray-100 dark:bg-gray-700 rounded-l-full"></div>
                        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 right-8 border-t-2 border-dashed border-gray-200 dark:border-gray-600"></div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
     );
});

EventTicketsSection.displayName = 'EventTicketsSection';