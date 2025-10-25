import React from 'react';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';
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
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 lg:p-6 p-5 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <FiFilter className="mr-2" />
          Filter Attendees
        </h3>
        
        {hasFilters && (
          <button
            onClick={onReset}
            className="flex items-center text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
          >
            <FiX className="mr-1" />
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search attendees"
            placeholder="Search by name or email..."
            className="pl-10 w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
          />
        </div>

        <select
          value={ticketTypeFilter}
          onChange={(e) => setTicketTypeFilter(e.target.value)}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
        >
          <option value="">All Ticket Types</option>
          {ticketTypes.map((type) => (
            <option key={type.name} value={type.name}>
              {type.name} (₦{type.price.toLocaleString()})
            </option>
          ))}
        </select>

        <select
          value={scannedFilter}
          onChange={(e) => setScannedFilter(e.target.value)}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
        >
          <option value="">All Statuses</option>
          <option value="scanned">Scanned</option>
          <option value="not_scanned">Not scanned</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                     focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
        >
          <option value="">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
    </div>
  );
};