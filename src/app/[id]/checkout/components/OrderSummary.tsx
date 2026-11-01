import React, { useState } from 'react';
import type { Event, Ticket } from '@/types/event';
import type { OrderCharges } from '@/utils/fees';
import { formatPrice } from '@/utils/formatPrice';
import { formatEventDate, formatEventTime } from '@/utils/formatDateTime';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { Calendar, ChevronDown, Lock, MapPin } from '@/icon-adapters/lucide-react';

interface OrderSummaryProps {
  event: Event;
  ticket: Ticket | null;
  quantity: number;
  charges: OrderCharges;
  /** compact: collapsible bar for small screens */
  variant: 'sidebar' | 'compact';
}

export const eventPlaceLabel = (event: Event) => {
  if (event.isVirtual) return 'Online event';
  if (event.locationVisibility === 'undisclosed') return 'Location to be announced';
  if (event.locationVisibility === 'secret') return 'Location shared after purchase';
  return [event.venue, event.location].filter(Boolean).join(', ') || 'Location to be announced';
};

function Lines({ ticket, quantity, charges }: Pick<OrderSummaryProps, 'ticket' | 'quantity' | 'charges'>) {
  if (!ticket) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Choose a ticket to see your total.</p>;
  }
  const isFree = charges.total === 0;
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-gray-600 dark:text-gray-400">{ticket.name} × {quantity}</dt>
        <dd className="font-medium text-gray-900 dark:text-white">{isFree ? 'Free' : formatPrice(charges.subtotal, 'NGN')}</dd>
      </div>
      {charges.serviceFee > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-400">Service charge</dt>
          <dd className="text-gray-900 dark:text-white">{formatPrice(charges.serviceFee, 'NGN')}</dd>
        </div>
      )}
      {charges.processingFee > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600 dark:text-gray-400">Payment processing fee</dt>
          <dd className="text-gray-900 dark:text-white">{formatPrice(charges.processingFee, 'NGN')}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-gray-200 pt-3 dark:border-gray-700">
        <dt className="text-base font-semibold text-gray-900 dark:text-white">Total</dt>
        <dd className="text-xl font-bold text-gray-900 dark:text-white">{isFree ? 'Free' : formatPrice(charges.total, 'NGN')}</dd>
      </div>
    </dl>
  );
}

export default function OrderSummary({ event, ticket, quantity, charges, variant }: OrderSummaryProps) {
  const [open, setOpen] = useState(false);
  const date = formatEventDate(event.date || event.startTime || '');
  const time = event.time ? formatEventTime(event.time) : '';

  const eventBlock = (
    <div className="flex gap-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
        <ImageWithFallback
          src={typeof event.image === 'string' ? event.image : null}
          alt={event.title}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="line-clamp-2 font-semibold leading-snug text-gray-900 dark:text-white">{event.title}</p>
        <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{date}{time ? ` · ${time}` : ''}</span>
        </p>
        <p className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span className="line-clamp-2">{eventPlaceLabel(event)}</span>
        </p>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className="rounded-card border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            {open ? 'Hide order summary' : 'Show order summary'}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {ticket ? (charges.total === 0 ? 'Free' : formatPrice(charges.total, 'NGN')) : '—'}
          </span>
        </button>
        {open && (
          <div className="space-y-5 border-t border-gray-100 px-5 pb-5 pt-4 dark:border-gray-700">
            {eventBlock}
            <Lines ticket={ticket} quantity={quantity} charges={charges} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order summary</h2>
      <div className="mt-5">{eventBlock}</div>
      <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-700">
        <Lines ticket={ticket} quantity={quantity} charges={charges} />
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Lock className="h-3.5 w-3.5" />
        Secure checkout. Payments are processed by Paystack.
      </p>
    </div>
  );
}
