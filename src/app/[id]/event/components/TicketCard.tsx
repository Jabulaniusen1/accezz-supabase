// components/EventTicketsSection.tsx
import React, { forwardRef } from 'react';
import { CheckCircleIcon, TicketIcon } from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { type Event } from '@/types/event';
import { type Ticket } from '@/types/event';

interface EventTicketsSectionProps {
    event: Event;
    handleGetTicket: (ticket: Ticket) => void;
  }

export const EventTicketsSection = forwardRef<HTMLDivElement, EventTicketsSectionProps>(
    ({ event, handleGetTicket }, ref) => {
      return (
        <div 
          ref={ref} 
          className="bg-white dark:bg-gray-900 py-12"
        >
            <div className="mx-auto lg:px-32 px-4 sm:px-6">
                {/* Simple Header */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Available Tickets
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Select your ticket type
                    </p>
                </div>

                {/* Compact Ticket List */}
                <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {event?.ticketType.map((ticket, index) => (
                    <div 
                        key={index} 
                        style={{ borderRadius: '10px' }}
                        className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:border-[#f54502]/30"
                    >
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                {/* Left Side - Ticket Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-[#f54502]/10 rounded-full">
                                            <TicketIcon className="w-4 h-4 text-[#f54502]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {ticket.name}
                                            </h3>
                                            <p className="text-2xl font-bold text-[#f54502]">
                                                {formatPrice(parseFloat(ticket.price), '₦')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Ticket Details - Compact */}
                                    <div className="ml-11 space-y-1">
                                        {ticket.details ? (
                                            ticket.details.split('\n').slice(0, 2).map((detail, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{detail}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">Standard Event Entry</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">Access to Main Area</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side - Status & Button */}
                                <div className="flex flex-col items-end gap-3 ml-4">
                                    {/* Status Badge */}
                                    {parseInt(ticket.quantity) === 0 ? (
                                        <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                            Sold Out
                                        </span>
                                    ) : parseInt(ticket.quantity) <= 3 ? (
                                        <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
                                            Only {ticket.quantity} left
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                                            Available
                                        </span>
                                    )}

                                    {/* Purchase Button */}
                                    <button
                                        disabled={parseInt(ticket.quantity) === 0}
                                        style={{ borderRadius: '5px' }}
                                        onClick={() => handleGetTicket(ticket)}
                                        className={`
                                            px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                            ${parseInt(ticket.quantity) === 0 
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                : 'bg-[#f54502] text-white hover:bg-[#f54502]/90 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        {parseInt(ticket.quantity) === 0 ? 'Sold Out' : 'Select'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
     );
});

EventTicketsSection.displayName = 'EventTicketsSection';