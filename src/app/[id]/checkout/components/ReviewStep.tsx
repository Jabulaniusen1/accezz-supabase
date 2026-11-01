import React from 'react';
import Link from 'next/link';
import { Lock } from '@/icon-adapters/lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { GENDER_OPTIONS, type BuyerDetails, type CheckoutStep, type TicketHolder } from './checkout';

interface ReviewStepProps {
  ticketName: string;
  quantity: number;
  subtotal: number;
  buyer: BuyerDetails;
  useSameDetails: boolean;
  holders: TicketHolder[];
  isFree: boolean;
  onEdit: (step: CheckoutStep) => void;
}

const genderLabel = (value: string) => GENDER_OPTIONS.find((g) => g.value === value)?.label || '';

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-brand hover:text-brand-dark">
          Edit
        </button>
      </div>
      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">{children}</div>
    </section>
  );
}

export default function ReviewStep({
  ticketName,
  quantity,
  subtotal,
  buyer,
  useSameDetails,
  holders,
  isFree,
  onEdit,
}: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <ReviewBlock title="Tickets" onEdit={() => onEdit(0)}>
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium text-gray-900 dark:text-white">{quantity} × {ticketName}</span>
          <span className="font-medium text-gray-900 dark:text-white">{isFree ? 'Free' : formatPrice(subtotal, 'NGN')}</span>
        </div>
      </ReviewBlock>

      <ReviewBlock title="Contact" onEdit={() => onEdit(1)}>
        <p className="font-medium text-gray-900 dark:text-white">{buyer.fullName}</p>
        <p className="mt-0.5">{buyer.email}</p>
        <p className="mt-0.5">{buyer.phone}{buyer.gender ? ` · ${genderLabel(buyer.gender)}` : ''}</p>
      </ReviewBlock>

      {quantity > 1 && (
        <ReviewBlock title="Ticket holders" onEdit={() => onEdit(1)}>
          {useSameDetails ? (
            <p>All {quantity} tickets are in your name and will be sent to {buyer.email}.</p>
          ) : (
            <ul className="space-y-1.5">
              <li><span className="font-medium text-gray-900 dark:text-white">{buyer.fullName}</span> · {buyer.email}</li>
              {holders.slice(0, quantity - 1).map((holder, i) => (
                <li key={i}><span className="font-medium text-gray-900 dark:text-white">{holder.name}</span> · {holder.email}</li>
              ))}
            </ul>
          )}
        </ReviewBlock>
      )}

      {!isFree && (
        <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800 sm:p-5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm dark:bg-gray-900">
            <Lock className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-gray-900 dark:text-white">Pay securely with Paystack</p>
            <p className="mt-0.5 text-gray-600 dark:text-gray-400">
              Card, bank transfer or USSD. You&apos;ll finish payment on Paystack and come straight back to your tickets.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        By continuing you agree to our{' '}
        <Link href="/term&condition" className="underline hover:text-brand">Terms</Link> and{' '}
        <Link href="/refund-policy" className="underline hover:text-brand">Refund policy</Link>.
      </p>
    </div>
  );
}
