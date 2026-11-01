// components/EventTicketsSection.tsx
import React, { forwardRef } from 'react';
import { CheckCircleIcon, TicketIcon } from '@/icon-adapters/lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { type Event } from '@/types/event';
import { type Ticket } from '@/types/event';
import { isEventPast } from '@/utils/eventUtils';

interface EventTicketsSectionProps {
    event: Event;
    handleGetTicket: (ticket: Ticket) => void;
  }

export const EventTicketsSection = forwardRef<HTMLDivElement, EventTicketsSectionProps>(
    ({ event, handleGetTicket }, ref) => {
      const eventIsPast = isEventPast(event);
      
      return (
        <div 
          ref={ref} 
          className="bg-white dark:bg-gray-900 py-12"
        >
            <div className="page-container">
                {/* Simple Header */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Available Tickets
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Select your ticket type
                    </p>
                </div>

                {/* Ticket List: cards in a row share a height; button pinned to the bottom */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {event?.ticketType.map((ticket, index) => {
                    const remaining = Math.max(0, (parseInt(ticket.quantity) || 0) - (parseInt(ticket.sold) || 0));
                    const soldOut = remaining === 0;
                    const details = ticket.details
                        ? ticket.details.split('\n').map((d) => d.trim()).filter(Boolean).slice(0, 3)
                        : ['Standard Event Entry', 'Access to Main Area'];

                    return (
                    <div
                        key={index}
                        className="group flex h-full flex-col rounded-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-brand/30"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex-shrink-0 p-2 bg-brand/10 rounded-full">
                                    <TicketIcon className="w-4 h-4 text-brand" />
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                    {ticket.name}
                                </h3>
                            </div>
                            {soldOut ? (
                                <span className="flex-shrink-0 px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                    Sold Out
                                </span>
                            ) : remaining <= 3 ? (
                                <span className="flex-shrink-0 px-3 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
                                    Only {remaining} left
                                </span>
                            ) : (
                                <span className="flex-shrink-0 px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                                    Available
                                </span>
                            )}
                        </div>

                        <p className="mt-3 text-2xl font-bold text-brand">
                            {formatPrice(parseFloat(ticket.price), '₦')}
                        </p>

                        <ul className="mt-3 flex-1 space-y-1.5">
                            {details.map((detail, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <CheckCircleIcon className="mt-0.5 w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{detail}</span>
                                </li>
                            ))}
                        </ul>

                        {eventIsPast ? (
                            <span className="mt-5 w-full px-6 py-2.5 text-center text-sm font-medium rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed">
                                Event Ended
                            </span>
                        ) : (
                            <button
                                disabled={soldOut}
                                onClick={() => handleGetTicket(ticket)}
                                className={`mt-5 w-full px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                    soldOut
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-brand text-white hover:bg-brand-dark hover:shadow-md'
                                }`}
                            >
                                {soldOut ? 'Sold Out' : 'Select'}
                            </button>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
        </div>
     );
});

EventTicketsSection.displayName = 'EventTicketsSection';