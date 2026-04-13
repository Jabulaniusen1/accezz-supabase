import React from 'react';
import { formatPrice } from '../../../utils/formatPrice';
import { FaCheckCircle, FaTicketAlt } from 'react-icons/fa';

const parsePriceValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

interface Ticket {
  id: string;
  name: string;
  price: string;
  quantity: string;
  sold: string;
  details?: string;
}

interface TicketSelectionStepProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  handleTicketSelection: (ticket: Ticket) => void;
  quantity: number;
  handleQuantityChange: (newQuantity: number) => void;
  totalPrice: number;
}

const TicketSelectionStep = ({
  tickets,
  selectedTicket,
  handleTicketSelection,
  quantity,
  handleQuantityChange,
  totalPrice,
}: TicketSelectionStepProps) => {
  const remaining = selectedTicket
    ? Math.max(0, parseInt(selectedTicket.quantity) - parseInt(selectedTicket.sold))
    : 0;

  return (
    <div className="space-y-5">
      {/* Ticket list */}
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const ticketRemaining = parseInt(ticket.quantity) - parseInt(ticket.sold);
          const isSoldOut = ticketRemaining <= 0;
          const isSelected = selectedTicket?.id === ticket.id;
          const isFree = parsePriceValue(ticket.price) === 0;

          return (
            <button
              key={ticket.id}
              type="button"
              disabled={isSoldOut}
              onClick={() => !isSoldOut && handleTicketSelection(ticket)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 focus:outline-none
                ${isSelected
                  ? 'border-[#f54502] bg-[#f54502]/5 dark:bg-[#f54502]/10'
                  : isSoldOut
                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-[#f54502]/50 dark:hover:border-[#f54502]/50 cursor-pointer'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: radio + info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isSelected ? 'border-[#f54502] bg-[#f54502]' : 'border-gray-300 dark:border-gray-600'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {ticket.name}
                      </p>
                      {isSoldOut && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>
                    {ticket.details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {ticket.details}
                      </p>
                    )}
                    {!isSoldOut && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {ticketRemaining} left
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: price */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-base font-bold text-[#f54502]">
                    {isFree ? 'Free' : formatPrice(parsePriceValue(ticket.price), 'NGN')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">per ticket</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quantity + summary — only shown when a ticket is selected */}
      {selectedTicket && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Quantity row */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-medium transition-colors
                  ${quantity <= 1
                    ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'border-[#f54502]/60 text-[#f54502] hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20'
                  }`}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-bold text-gray-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(Math.min(remaining, quantity + 1))}
                disabled={quantity >= remaining}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-medium transition-colors
                  ${quantity >= remaining
                    ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'border-[#f54502]/60 text-[#f54502] hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20'
                  }`}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="px-4 py-3 space-y-1.5 bg-white dark:bg-gray-900">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {selectedTicket.name} × {quantity}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {parsePriceValue(selectedTicket.price) === 0
                  ? 'Free'
                  : formatPrice(parsePriceValue(selectedTicket.price) * quantity, 'NGN')}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#f54502]/5 dark:bg-[#f54502]/10 border-t border-[#f54502]/10">
            <div className="flex items-center gap-2">
              <FaTicketAlt className="w-4 h-4 text-[#f54502]" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total</span>
            </div>
            <span className="text-lg font-bold text-[#f54502]">
              {parsePriceValue(selectedTicket.price) === 0
                ? 'Free'
                : formatPrice(totalPrice, 'NGN')}
            </span>
          </div>
        </div>
      )}

      {!selectedTicket && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
          Select a ticket type above to continue
        </p>
      )}
    </div>
  );
};

export default TicketSelectionStep;
