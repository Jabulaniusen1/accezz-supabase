import React from 'react';
import { formatPrice } from '../../../utils/formatPrice';

interface PaymentStepProps {
  selectedTicket: { name: string; price: string } | null;
  quantity: number;
  totalPrice: number;
  handlePurchase: () => void;
  isLoading: boolean;
}

const parsePriceValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const PaymentStep = ({ selectedTicket, quantity, totalPrice, handlePurchase, isLoading } : PaymentStepProps) => {
  const pricePerTicket = parsePriceValue(selectedTicket?.price);
  const computedTotal = totalPrice > 0 ? totalPrice : pricePerTicket * quantity;
  return (
    <div className="mb-4 space-y-6">
      <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4 text-center">
          Payment Summary
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Ticket Type
            </p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {selectedTicket?.name}
            </p>
          </div>

          <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Quantity
            </p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {quantity}
            </p>
          </div>

          <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Price per ticket
            </p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {formatPrice(pricePerTicket, 'NGN')}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-gray-900 dark:text-white text-sm">
                Total Amount
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatPrice(computedTotal, 'NGN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handlePurchase}
        disabled={isLoading}
        className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
          isLoading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-[#f54502] text-white hover:bg-[#f54502]/90 '
        }`}
        style={{ borderRadius: 12 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <span className="animate-spin">⌛</span>
            <span>Processing Payment...</span>
          </div>
        ) : (
          <span className="text-base font-medium">Make Payment</span>
        )}
      </button>
    </div>
  );
};

export default PaymentStep;