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
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Payment Summary
            </p>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Review your order
            </h3>
          </div>
          <span className="rounded-full bg-[#f54502]/15 px-3 py-1 text-xs font-medium text-[#f54502] dark:bg-[#f54502]/20">
            Secure checkout
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-[8px] border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <span className="text-gray-500 dark:text-gray-400">Ticket Type</span>
            <span className="font-medium text-gray-900 dark:text-white">{selectedTicket?.name}</span>
          </div>

          <div className="flex items-center justify-between rounded-[8px] border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <span className="text-gray-500 dark:text-gray-400">Quantity</span>
            <span className="font-medium text-gray-900 dark:text-white">{quantity}</span>
          </div>

          <div className="flex items-center justify-between rounded-[8px] border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <span className="text-gray-500 dark:text-gray-400">Price per ticket</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatPrice(pricePerTicket, 'NGN')}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-[10px] bg-[#f54502]/5 p-4 dark:bg-[#f54502]/10">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Total Amount</span>
            <span className="text-lg font-semibold text-[#f54502]">
              {formatPrice(computedTotal, 'NGN')}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handlePurchase}
        disabled={isLoading}
        className={`w-full rounded-[5px] bg-[#f54502] py-3 font-medium text-white transition-all hover:bg-[#f54502]/90 disabled:cursor-not-allowed disabled:bg-gray-400`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Processing payment...</span>
          </div>
        ) : (
          <span className="text-base font-medium">Make Payment</span>
        )}
      </button>
    </div>
  );
};

export default PaymentStep;