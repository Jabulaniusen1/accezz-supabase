'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDollarSign, FiUsers } from '@/icon-adapters/react-icons/fi';
import { Skeleton } from '@/components/ui/Skeleton';

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  details: string | null;
  revenue: number;
}

interface TicketTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

const TicketTypesModal: React.FC<TicketTypesModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}) => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ticket_types')
        .select('id, name, price, quantity, sold, details')
        .eq('event_id', eventId)
        .order('name');

      if (fetchError) throw fetchError;

      const ticketTypesWithRevenue: TicketType[] = (data || []).map((tt) => ({
        id: tt.id,
        name: tt.name,
        price: Number(tt.price || 0),
        quantity: Number(tt.quantity || 0),
        sold: Number(tt.sold || 0),
        details: tt.details,
        revenue: Number(tt.sold || 0) * Number(tt.price || 0),
      }));

      setTicketTypes(ticketTypesWithRevenue);
    } catch (err) {
      console.error('Error fetching ticket types:', err);
      setError('Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchTicketTypes();
    } else {
      setTicketTypes([]);
      setError(null);
    }
  }, [isOpen, eventId, fetchTicketTypes]);

  const totalRevenue = ticketTypes.reduce((sum, tt) => sum + tt.revenue, 0);
  const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.sold, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Ticket Types & Revenue
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {eventTitle}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton height="60px" />
                  <Skeleton height="60px" />
                  <Skeleton height="60px" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : ticketTypes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No ticket types found for this event
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-[#f54502] to-[#d63a02] rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90 mb-1">Total Revenue</p>
                          <p className="text-3xl font-bold">₦{totalRevenue.toLocaleString()}</p>
                        </div>
                        <FiDollarSign size={32} className="opacity-80" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90 mb-1">Total Tickets Sold</p>
                          <p className="text-3xl font-bold">{totalSold.toLocaleString()}</p>
                        </div>
                        <FiUsers size={32} className="opacity-80" />
                      </div>
                    </div>
                  </div>

                  {/* Ticket Types Table */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Ticket Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Sold
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Remaining
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {ticketTypes.map((tt) => {
                            const remaining = tt.quantity - tt.sold;
                            const soldPercentage = tt.quantity > 0 ? (tt.sold / tt.quantity) * 100 : 0;
                            
                            return (
                              <tr
                                key={tt.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {tt.name}
                                    </div>
                                    {tt.details && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {tt.details}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  ₦{tt.price.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {tt.quantity.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {tt.sold.toLocaleString()}
                                    </div>
                                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                      <div
                                        className="bg-[#f54502] h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#f54502] dark:text-[#f54502]">
                                  ₦{tt.revenue.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`text-sm font-medium ${
                                      remaining <= 10
                                        ? 'text-red-600 dark:text-red-400'
                                        : remaining <= 50
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}
                                  >
                                    {remaining.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TicketTypesModal;
