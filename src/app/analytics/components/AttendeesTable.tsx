import React, { useState, useMemo } from 'react';
import { Ticket } from '@/types/analytics';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';

interface AttendeesTableProps {
  tickets: Ticket[];
}

const ITEMS_PER_PAGE = 10;

export const AttendeesTable: React.FC<AttendeesTableProps> = ({ tickets }) => {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => Number(b.paid) - Number(a.paid)),
    [tickets]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  const slice = sorted.slice(start, start + ITEMS_PER_PAGE);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (tickets.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
        No attendees found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">
                Attendee
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">
                Ticket
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">
                Payment
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">
                Check-in
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">
                Guests
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {slice.map((ticket) => (
              <React.Fragment key={ticket.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  {/* Attendee */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300 text-sm font-medium">
                        {ticket.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">
                          {ticket.fullName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
                          {ticket.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Ticket type */}
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
                      {ticket.ticketType || '—'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="hidden sm:table-cell px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                    {new Date(ticket.purchaseDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-3">
                    {ticket.paid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Unpaid
                      </span>
                    )}
                  </td>

                  {/* Check-in */}
                  <td className="hidden md:table-cell px-4 py-3">
                    {ticket.isScanned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Checked in
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Not yet</span>
                    )}
                  </td>

                  {/* Guests toggle */}
                  <td className="px-4 py-3">
                    {ticket.attendees.length > 0 ? (
                      <button
                        onClick={() => toggle(ticket.id)}
                        className="flex items-center gap-1 text-xs text-[#f54502] hover:text-[#d63a02] font-medium"
                      >
                        {ticket.attendees.length}
                        {expanded.has(ticket.id) ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                </tr>

                {/* Expanded guests */}
                {expanded.has(ticket.id) && ticket.attendees.length > 0 && (
                  <tr className="bg-gray-50 dark:bg-gray-800/30">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="pl-11 space-y-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Additional guests
                        </p>
                        {ticket.attendees.map((a) => (
                          <div
                            key={`${ticket.id}-${a.email}`}
                            className="flex items-center gap-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {a.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {a.name}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {a.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {start + 1}–{Math.min(start + ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-[2rem] h-8 px-2 rounded-md border text-xs font-medium transition ${
                  n === page
                    ? 'bg-[#f54502] border-[#f54502] text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
