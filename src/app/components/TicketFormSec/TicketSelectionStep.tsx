import React from 'react';
import { formatPrice } from '../../../utils/formatPrice';

const parsePriceValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

// Define the type for a ticket
interface Ticket {
  id: string;
  name: string;
  price: string;
  quantity: string;
  sold: string;
  details?: string;
}

// Define the props interface for the component
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
  return (
    <div className="mb-4 space-y-8 pr-1 sm:pr-2">
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-3">
          Available Tickets
        </h3>
        
        {tickets.map((ticket) => (
          <div key={ticket.name}>
            <div
              onClick={() => {
                const isSoldOut = parseInt(ticket.quantity) === 0;
                if (!isSoldOut) handleTicketSelection(ticket);
              }}
              className={`p-4 border rounded-xl transition-all duration-200 cursor-pointer
                ${selectedTicket?.name === ticket.name 
                  ? 'border-[#f54502] bg-[#f54502]/10 dark:bg-[#f54502]/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-[#f54502]/50 dark:hover:border-[#f54502]/50'
                }
                ${parseInt(ticket.quantity) === 0 ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {ticket.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ticket.details || 'Standard admission ticket'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#f54502] dark:text-[#f54502]">
                    {formatPrice(parsePriceValue(ticket.price), 'NGN')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {parseInt(ticket.quantity)}  remaining
                  </p>
                </div>
              </div>
              
              {parseInt(ticket.quantity) === 0 && (
                <span className="mt-2 inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                  Sold Out
                </span>
              )}
            </div>

            {/* Selected Ticket Section - appears right under the selected ticket */}
            {selectedTicket?.name === ticket.name && (
              <div className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6 transform transition-all duration-300 ease-out" style={{ animation: 'slideDown 0.3s ease-out' }}>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    Selected Ticket
                  </h4>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedTicket.name}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    Quantity
                  </h4>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className={`w-9 h-9 rounded-[5px] flex items-center justify-center border transition-colors
                        ${quantity <= 1 
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'border-[#f54502] text-[#f54502] hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20'
                        }`}
                    >
                      <span className="text-lg">-</span>
                    </button>
                    <span className="text-lg font-medium text-gray-900 dark:text-white w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(Math.min(
                        parseInt(selectedTicket.quantity) - parseInt(selectedTicket.sold),
                        quantity + 1
                      ))}
                      disabled={quantity >= parseInt(selectedTicket.quantity) - parseInt(selectedTicket.sold)}
                      className={`w-9 h-9 rounded-[5px] flex items-center justify-center border transition-colors
                        ${quantity >= parseInt(selectedTicket.quantity) - parseInt(selectedTicket.sold)
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-[#f54502] text-[#f54502] hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20'
                        }`}
                    >
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-600 dark:text-gray-300">
                      Price per ticket
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatPrice(parsePriceValue(selectedTicket.price), 'NGN')}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Total Amount
                    </p>
                    <p className="text-xl font-bold text-[#f54502] dark:text-[#f54502]">
                      {formatPrice(totalPrice, 'NGN')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketSelectionStep;