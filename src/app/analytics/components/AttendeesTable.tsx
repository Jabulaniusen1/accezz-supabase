import React, { useState, useMemo } from 'react';
import { Ticket } from '@/types/analytics';
import { FiUserCheck, FiUserX, FiChevronLeft, FiChevronRight, FiDollarSign, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface AttendeesTableProps {
  tickets: Ticket[];
}

export const AttendeesTable: React.FC<AttendeesTableProps> = ({ tickets }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const itemsPerPage = 4;

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Sort tickets by payment status
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => (Number(b.paid) - Number(a.paid)));
  }, [tickets]);
  
  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = useMemo(() => {
    return sortedTickets.slice(indexOfFirstItem, indexOfLastItem);
  }, [sortedTickets, indexOfFirstItem, indexOfLastItem]);
  
  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="overflow-x-auto">
          {/* Mobile view - cards */}
          <div className="sm:hidden space-y-2 p-2">
            {currentTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 ${!ticket.paid ? 'opacity-60' : 'opacity-100'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        {ticket.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                        {ticket.fullName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {ticket.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${ticket.paid ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
                      {ticket.paid ? 'Paid' : 'Unpaid'}
                    </span>
                    <div className="mt-1 flex items-center text-xs">
                      {ticket.isScanned ? (
                        <>
                          <FiUserCheck className="text-green-500 mr-1" />
                          <span className="text-green-600 dark:text-green-400">Scanned</span>
                        </>
                      ) : (
                        <>
                          <FiUserX className="text-red-500 mr-1" />
                          <span className="text-red-600 dark:text-red-400">Not scanned</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                    {ticket.ticketType}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(ticket.purchaseDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                {/* Sub-attendees section */}
                {ticket.attendees.length > 0 && (
                  <div className="mt-3">
                    <button 
                      onClick={() => toggleRow(ticket.id)}
                      className="flex items-center text-xs font-medium text-blue-600 dark:text-blue-400"
                    >
                      {expandedRows.has(ticket.id) ? (
                        <>
                          <FiChevronUp className="mr-1" />
                          Hide {ticket.attendees.length} guest{ticket.attendees.length !== 1 ? 's' : ''}
                        </>
                      ) : (
                        <>
                          <FiChevronDown className="mr-1" />
                          Show {ticket.attendees.length} guest{ticket.attendees.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                    
                    {expandedRows.has(ticket.id) && (
                      <div className="mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Additional Guests:
                        </div>
                        <ul className="space-y-2">
                          {ticket.attendees.map((attendee) => (
                            <li key={`${ticket.id}-${attendee.email}`} className="flex items-start">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {attendee.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                  {attendee.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {attendee.email}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop view - table */}
          <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Attendee
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Guests
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {currentTickets.map((ticket) => (
                <React.Fragment key={ticket.id}>
                  <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                    ${!ticket.paid ? 'opacity-60' : 'opacity-100'}`}>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-300">
                            {ticket.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {ticket.fullName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {ticket.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                        {ticket.ticketType}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(ticket.purchaseDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${ticket.paid 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                          <FiDollarSign className="mr-1" />
                          {ticket.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {ticket.isScanned ? (
                          <>
                            <FiUserCheck className="text-green-500 mr-1" />
                            <span className="text-sm text-green-600 dark:text-green-400">Scanned</span>
                          </>
                        ) : (
                          <>
                            <FiUserX className="text-red-500 mr-1" />
                            <span className="text-sm text-red-600 dark:text-red-400">Not scanned</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleRow(ticket.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                      >
                        {ticket.attendees.length} guest{ticket.attendees.length !== 1 ? 's' : ''}
                        {expandedRows.has(ticket.id) ? (
                          <FiChevronUp className="ml-1" />
                        ) : (
                          <FiChevronDown className="ml-1" />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Sub-attendees row */}
                  {expandedRows.has(ticket.id) && ticket.attendees.length > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={6} className="px-4 sm:px-6 py-4">
                        <div className="ml-12">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional Guests:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ticket.attendees.map((attendee) => (
                              <div 
                                key={`${ticket.id}-${attendee.email}`}
                                className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                              >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center mr-3">
                                  <span className="text-gray-600 dark:text-gray-300">
                                    {attendee.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {attendee.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {attendee.email}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg gap-3">
          <div className="flex items-center">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastItem, tickets.length)}
              </span>{' '}
              of <span className="font-medium">{tickets.length}</span> results
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 
                       text-gray-700 dark:text-gray-300 disabled:opacity-50 
                       disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 
                       transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex overflow-x-auto gap-1 sm:gap-2">
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                const isCurrentPage = pageNumber === currentPage;

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`min-w-[2rem] px-2 py-1 rounded-md border ${
                      isCurrentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    } transition-colors`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 
                       text-gray-700 dark:text-gray-300 disabled:opacity-50 
                       disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 
                       transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};