import React from 'react';
import { formatPrice } from '../../../utils/formatPrice';
import { FaLock, FaTicketAlt } from 'react-icons/fa';

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

const PaymentStep = ({ selectedTicket, quantity, totalPrice, handlePurchase, isLoading }: PaymentStepProps) => {
  const pricePerTicket = parsePriceValue(selectedTicket?.price);
  const computedTotal = totalPrice > 0 ? totalPrice : pricePerTicket * quantity;
  const isFree = pricePerTicket === 0;

  return (
    <div className="space-y-5">
      {/* Order summary */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Order Summary
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Ticket</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedTicket?.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Quantity</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{quantity}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Price per ticket</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isFree ? 'Free' : formatPrice(pricePerTicket, 'NGN')}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-4 bg-[#f54502]/5 dark:bg-[#f54502]/10 border-t border-[#f54502]/10">
          <div className="flex items-center gap-2">
            <FaTicketAlt className="w-4 h-4 text-[#f54502]" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">Total</span>
          </div>
          <span className="text-xl font-bold text-[#f54502]">
            {isFree ? 'Free' : formatPrice(computedTotal, 'NGN')}
          </span>
        </div>
      </div>

      {/* Security note */}
      {!isFree && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 px-1">
          <FaLock className="w-3 h-3 flex-shrink-0" />
          <span>Payments are processed securely via Paystack. Your card details are never stored.</span>
        </div>
      )}

      {/* Pay button */}
      <button
        type="button"
        onClick={handlePurchase}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 rounded-xl py-4 text-base font-semibold text-white bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#d63a02] hover:to-[#b52e00] shadow-lg shadow-[#f54502]/25 hover:shadow-[#f54502]/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isLoading ? (
          <>
            <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Processing…</span>
          </>
        ) : (
          <>
            <FaLock className="w-4 h-4 opacity-80" />
            <span>{isFree ? 'Get Free Ticket' : `Pay ${formatPrice(computedTotal, 'NGN')}`}</span>
          </>
        )}
      </button>
    </div>
  );
};

export default PaymentStep;
