import React from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaTicketAlt, FaLock } from 'react-icons/fa';
import { Button } from '@mui/material';
import { formatPrice } from '@/utils/formatPrice';

interface VirtualEventTicketsProps {
  event: Event;
  setSelectedTicket: (ticket: {
    id: string;
    name: string;
    price: string;
    quantity: string;
    sold: string;
    details?: string;
  }) => void;
  setShowWhatsAppModal: (show: boolean) => void;
}

export default function VirtualEventTickets({ 
  event, 
  setSelectedTicket,
  setShowWhatsAppModal
}: VirtualEventTicketsProps) {
  const handleGetTicket = (ticket: {
    name: string;
    price: string;
    quantity: string;
    sold: string;
    details?: string;
  }) => {
    setSelectedTicket({
      id: event.id || '',
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.quantity,
      sold: ticket.sold,
      details: ticket.details || '' 
    });
    setShowWhatsAppModal(true);
  };
  // Toast state
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2">
          <div
            className={`px-4 py-2 rounded shadow-lg text-white font-semibold ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
            <button
              className="ml-3 text-white font-bold"
              onClick={() => setToast(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="py-10 px-2 sm:px-6 bg-gradient-to-br from-[#f54502]/5 via-[#f54502]/10 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-[80vh]">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-[#f54502] via-[#f54502] to-[#f54502] tracking-tight flex items-center justify-center gap-3">
          <FaTicketAlt className="inline-block text-[#f54502] text-3xl" />
          VIRTUAL ACCESS PASSES
        </h2>
        <div className="flex flex-wrap gap-8 justify-center">
          {event.ticketType.map((ticket, index) => {
            const remaining = parseInt(ticket.quantity);
            const soldOut = remaining <= 0;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.5, type: "spring" }}
                className={`
                  relative w-full max-w-xs sm:max-w-sm md:max-w-md
                  bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-0
                  flex flex-col justify-between
                  overflow-visible
                  ${soldOut ? 'opacity-60 grayscale pointer-events-none' : ''}
                `}
                style={{
                  minHeight: 340,
                  boxShadow: "0 8px 32px 0 rgba(80, 60, 180, 0.18), 0 1.5px 6px 0 rgba(80,60,180,0.08)"
                }}
              >
                {/* Ticket stub left */}
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-16 bg-gradient-to-b from-[#f54502] to-[#d63a02] rounded-l-3xl shadow-lg z-10 border-4 border-white dark:border-gray-900"></div>
                {/* Ticket stub right */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-16 bg-gradient-to-b from-[#f54502] to-[#d63a02] rounded-r-3xl shadow-lg z-10 border-4 border-white dark:border-gray-900"></div>
                {/* Perforation */}
                <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-gray-200 dark:border-gray-700"></div>
                {/* Sold out overlay */}
                {soldOut && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <span className="bg-red-600/90 text-white text-lg font-bold px-6 py-2 rounded-2xl shadow-lg rotate-[-10deg] tracking-widest border-2 border-white dark:border-gray-900">
                      SOLD OUT
                    </span>
                  </div>
                )}
                {/* Hot badge */}
                {remaining > 0 && remaining <= 3 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <span className="inline-flex items-center bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg whitespace-nowrap animate-pulse">
                      <span className="mr-1">🔥</span>
                      Only {remaining} left!
                    </span>
                  </div>
                )}
                {/* Main ticket content */}
                <div className="flex-1 flex flex-col justify-between px-8 pt-8 pb-6">
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-[#f54502] to-[#d63a02] bg-clip-text text-transparent mb-2">
                      {ticket.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-3xl font-extrabold text-[#f54502] dark:text-[#f54502]">
                        {formatPrice(Number(ticket.price), event.currency || '₦')}
                      </span>
                      {Number(ticket.price) === 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold align-middle">Free</span>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {remaining} remaining
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ticket.details ? (
                        ticket.details.split('\n').map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="inline-block w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300 text-sm">{detail}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="inline-block w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300 text-sm">Virtual event access</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      handleGetTicket(ticket);
                      setToast(null);
                    }}
                    disabled={soldOut}
                    sx={{
                      py: 1.7,
                      borderRadius: '1.5rem',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      letterSpacing: '0.03em',
                      background: 'linear-gradient(90deg, #2563eb 0%,rgb(58, 237, 204) 100%)',
                      boxShadow: '0 4px 16px 0 rgba(124,58,237,0.10)',
                      color: '#fff',
                      mt: 3,
                      textTransform: 'uppercase',
                      ':hover': {
                        background: 'linear-gradient(90deg, #7c3aed 0%,rgb(37, 235, 222) 100%)',
                        color: '#fff',
                        boxShadow: '0 8px 24px 0 rgba(37,99,235,0.18)',
                        transform: 'translateY(-2px) scale(1.03)'
                      },
                      ':disabled': {
                        background: '#9CA3AF',
                        color: '#fff',
                        opacity: 0.7
                      },
                      transition: 'all 0.3s cubic-bezier(.4,2,.3,1)'
                    }}
                  >
                    {soldOut ? 'SOLD OUT' : 'GET PASS'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="max-w-xl mx-auto mt-14">
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#f54502]/10 to-[#f54502]/20 dark:from-gray-800 dark:to-gray-700 p-5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow">
            <FaLock className="text-gray-500 dark:text-gray-400 text-xl" />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Secure checkout process. Your virtual access details will be emailed immediately after purchase.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}