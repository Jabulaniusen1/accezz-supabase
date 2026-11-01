import React from 'react';
import type { Ticket } from '@/types/event';
import { formatPrice } from '@/utils/formatPrice';
import { maxPerOrder, parsePrice, ticketsLeft } from './checkout';

interface TicketPickerProps {
  tickets: Ticket[];
  selectedId: string | null;
  quantity: number;
  onSelect: (ticketId: string) => void;
  onQuantityChange: (quantity: number) => void;
  error?: string;
}

const LOW_STOCK = 10;

export default function TicketPicker({ tickets, selectedId, quantity, onSelect, onQuantityChange, error }: TicketPickerProps) {
  return (
    <div>
      <div role="radiogroup" aria-label="Ticket types" className="space-y-3">
        {tickets.map((ticket) => {
          const left = ticketsLeft(ticket);
          const soldOut = left <= 0;
          const selected = ticket.id === selectedId;
          const price = parsePrice(ticket.price);
          const max = maxPerOrder(ticket);

          return (
            <div
              key={ticket.id}
              className={`rounded-2xl border transition-colors ${
                selected
                  ? 'border-brand bg-brand/[0.04] ring-1 ring-brand dark:bg-brand/10'
                  : soldOut
                    ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40'
                    : 'border-gray-200 bg-white hover:border-brand/50 dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={soldOut}
                onClick={() => onSelect(ticket.id)}
                className="flex w-full items-start gap-4 rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 disabled:cursor-not-allowed sm:p-5"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-brand' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-base font-semibold ${soldOut ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {ticket.name}
                    </span>
                    {soldOut ? (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Sold out
                      </span>
                    ) : left <= LOW_STOCK ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Only {left} left
                      </span>
                    ) : null}
                  </span>
                  {ticket.details && (
                    <span className="mt-1 block text-sm leading-relaxed text-gray-500 dark:text-gray-400">{ticket.details}</span>
                  )}
                </span>

                <span className={`flex-shrink-0 text-base font-bold ${soldOut ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                  {price === 0 ? 'Free' : formatPrice(price, 'NGN')}
                </span>
              </button>

              {selected && !soldOut && (
                <div className="flex items-center justify-between gap-4 border-t border-brand/15 px-4 py-3 sm:px-5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity
                    <span className="ml-2 text-xs font-normal text-gray-400">Max {max}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Fewer tickets"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-lg text-gray-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-base font-bold text-gray-900 dark:text-white" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
                      disabled={quantity >= max}
                      aria-label="More tickets"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-lg text-gray-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
