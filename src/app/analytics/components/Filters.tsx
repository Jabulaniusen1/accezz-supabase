import React from 'react';
import { Search, X } from '@/icon-adapters/lucide-react';
import { TicketType } from '@/types/analytics';

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  ticketTypeFilter: string;
  setTicketTypeFilter: (value: string) => void;
  scannedFilter: string;
  setScannedFilter: (value: string) => void;
  paymentFilter: string;
  setPaymentFilter: (value: string) => void;
  ticketTypes: TicketType[];
  onReset: () => void;
}

const selectClass =
  'h-9 pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 transition';

export const Filters: React.FC<FiltersProps> = ({
  searchQuery,
  setSearchQuery,
  ticketTypeFilter,
  setTicketTypeFilter,
  scannedFilter,
  setScannedFilter,
  paymentFilter,
  setPaymentFilter,
  ticketTypes,
  onReset,
}) => {
  const hasFilters = searchQuery || ticketTypeFilter || scannedFilter || paymentFilter;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search attendees…"
          className="h-9 w-full pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 transition"
        />
      </div>

      {/* Ticket type */}
      <select
        value={ticketTypeFilter}
        onChange={(e) => setTicketTypeFilter(e.target.value)}
        className={selectClass}
      >
        <option value="">All types</option>
        {ticketTypes.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      {/* Check-in status */}
      <select
        value={scannedFilter}
        onChange={(e) => setScannedFilter(e.target.value)}
        className={selectClass}
      >
        <option value="">All check-in</option>
        <option value="scanned">Checked in</option>
        <option value="not_scanned">Not checked in</option>
      </select>

      {/* Payment */}
      <select
        value={paymentFilter}
        onChange={(e) => setPaymentFilter(e.target.value)}
        className={selectClass}
      >
        <option value="">All payments</option>
        <option value="paid">Paid</option>
        <option value="unpaid">Unpaid</option>
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 h-9 px-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};
