'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { RiTicketLine } from 'react-icons/ri';
import { useCallback, memo, useEffect, useRef } from 'react';
import { Event, Ticket, ToastProps } from '@/types/event';
import { formatPrice } from '@/utils/formatPrice';

interface TicketSetupProps {
  formData: Event;
  updateFormData: (data: Partial<Event>) => void;
  onNext: () => void;
  onBack: () => void;
  setToast: (toast: ToastProps | null) => void;
}

const TicketSetup = memo(function TicketSetup({ 
  formData, 
  updateFormData, 
  onNext, 
  onBack, 
  setToast 
}: TicketSetupProps) {
  const ticketCardsRef = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const previousTicketCountRef = useRef<number>(0);

  const handleAddTicket = useCallback(() => {
    updateFormData({
      ticketType: [
        ...formData.ticketType,
        {
          name: '',
          price: '',
          quantity: '',
          sold: '0',
          details: '',
          attendees: []
        }
      ]
    });
  }, [formData.ticketType, updateFormData]);

  // Scroll to newly added ticket
  useEffect(() => {
    const currentTicketCount = formData.ticketType.length;
    const previousTicketCount = previousTicketCountRef.current;

    // If a new ticket was added (count increased)
    if (currentTicketCount > previousTicketCount && currentTicketCount > 0) {
      const newTicketIndex = currentTicketCount - 1;
      
      // Use setTimeout to wait for DOM to update
      setTimeout(() => {
        const newTicketCard = ticketCardsRef.current[newTicketIndex];
        if (newTicketCard) {
          newTicketCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
          
          // Focus on the ticket name input (first text input in the card)
          const nameInput = newTicketCard.querySelector<HTMLInputElement>('input[type="text"]');
          if (nameInput) {
            setTimeout(() => nameInput.focus(), 300);
          }
        }
      }, 100);
    }

    // Update the previous count
    previousTicketCountRef.current = currentTicketCount;
  }, [formData.ticketType.length]);

  const handleRemoveTicket = useCallback((index: number) => {
    const updatedTickets = formData.ticketType.filter((_, i) => i !== index);
    updateFormData({ ticketType: updatedTickets });
  }, [formData.ticketType, updateFormData]);

  const handleTicketChange = useCallback((index: number, field: keyof Ticket, value: string) => {
    const updatedTickets = [...formData.ticketType];
    
    if (field === 'price' || field === 'quantity') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      updatedTickets[index] = { ...updatedTickets[index], [field]: numericValue };
    } else {
      updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    }
    updateFormData({ ticketType: updatedTickets });
  }, [formData.ticketType, updateFormData]);

  const handleFreeTicketChange = useCallback((index: number, isFree: boolean) => {
    const updatedTickets = [...formData.ticketType];
    updatedTickets[index] = { 
      ...updatedTickets[index], 
      price: isFree ? '0.00' : '' 
    };
    updateFormData({ ticketType: updatedTickets });
  }, [formData.ticketType, updateFormData]);

  const validateTickets = useCallback(() => {
    if (formData.ticketType.length === 0) {
      setToast({ 
        type: 'error', 
        message: 'Please add at least one ticket type',
        onClose: () => setToast(null)
      });
      return false;
    }

    for (const ticket of formData.ticketType) {
      if (!ticket.name.trim()) {
        setToast({ 
          type: 'error', 
          message: 'Please enter a name for all ticket types',
          onClose: () => setToast(null)
        });
        return false;
      }
      
      const price = parseFloat(ticket.price);
      if (isNaN(price)) {
        setToast({ 
          type: 'error', 
          message: 'Please enter a valid price for all ticket types',
          onClose: () => setToast(null)
        });
        return false;
      }

      const quantity = parseInt(ticket.quantity);
      if (isNaN(quantity)) {
        setToast({ 
          type: 'error', 
          message: 'Please enter a valid quantity for all ticket types',
          onClose: () => setToast(null)
        });
        return false;
      }
    }
    return true;
  }, [formData.ticketType, setToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center mb-6 sm:mb-8">
        <motion.h2 
          className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <RiTicketLine className="mr-2 sm:mr-3 text-[#f54502]" size={20} />
          <span className="bg-gradient-to-r from-[#f54502] to-[#d63a02] bg-clip-text text-transparent">
            Create Your Tickets
          </span>
        </motion.h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Design different ticket options for your event. Make them special!
        </p>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {formData.ticketType.map((ticket, index) => (
            <div
              key={index}
              ref={(el) => {
                ticketCardsRef.current[index] = el;
              }}
            >
              <TicketCard 
                index={index}
                ticket={ticket}
                currency={formData.currency || 'NGN'}
                onTicketChange={handleTicketChange}
                onFreeChange={handleFreeTicketChange}
                onRemove={handleRemoveTicket}
              />
            </div>
          ))}
        </AnimatePresence>

        <AddTicketButton onClick={handleAddTicket} />
        
        <NavigationButtons 
          onBack={onBack} 
          onNext={() => validateTickets() && onNext()} 
        />
      </div>
    </motion.div>
  );
});

const TicketCard = memo(function TicketCard({
  index,
  ticket,
  currency,
  onTicketChange,
  onFreeChange,
  onRemove
}: {
  index: number;
  ticket: Ticket;
  currency: string;
  onTicketChange: (index: number, field: keyof Ticket, value: string) => void;
  onFreeChange: (index: number, isFree: boolean) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="relative bg-white dark:bg-gray-800 rounded-[5px] p-4 sm:p-6 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300"
      whileHover={{ y: -3 }}
    >
      <div className="absolute -top-3 -left-3 bg-[#f54502] text-white px-2 sm:px-3 py-1 rounded-[5px] text-xs font-bold shadow-md">
        Ticket #{index + 1}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ticket Name *
          </label>
          <input
            type="text"
            value={ticket.name}
            onChange={(e) => onTicketChange(index, 'name', e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
            placeholder="e.g., VIP Pass, Early Bird"
            required
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Price *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {formatPrice(0, currency).charAt(0)}
              </span>
            </div>
            <input
              type="text"
              value={ticket.price}
              onChange={(e) => onTicketChange(index, 'price', e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-12 sm:pr-16 py-2 sm:py-3 rounded-[5px] border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
              placeholder="0.00"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                {currency}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quantity *
          </label>
          <input
            type="text"
            value={ticket.quantity}
            onChange={(e) => onTicketChange(index, 'quantity', e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border-2 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
            placeholder="100"
            required
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center">
          <label className="relative inline-flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={ticket.price === '0.00'}
              onChange={(e) => onFreeChange(index, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-200 dark:bg-gray-600 rounded-[5px] peer 
              peer-checked:after:translate-x-6 peer-checked:bg-[#f54502]
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
              after:bg-white after:border-gray-300 after:rounded-[5px] after:h-5 after:w-5 
              after:transition-all after:duration-300 peer-hover:shadow-lg
              peer-checked:after:border-white flex items-center justify-between px-1">
              <span className="text-xs text-white font-bold">FREE</span>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Free Ticket
            </span>
          </label>
        </div>

        <button
          onClick={() => onRemove(index)}
          className="flex items-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 group"
        >
          <FaTrash className="mr-1 group-hover:scale-110 transition-transform" />
          <span className="text-sm">Remove</span>
        </button>
      </div>
    </motion.div>
  );
});

const AddTicketButton = memo(function AddTicketButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(59, 130, 246, 0.3)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full py-4 sm:py-5 border-2 border-dashed border-[#f54502] dark:border-[#f54502]
              rounded-[5px] text-[#f54502] dark:text-[#f54502] font-medium text-sm sm:text-base
              hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20 transition-all duration-300
              flex flex-col items-center justify-center space-y-2 group"
    >
      <div className="w-8 h-6 sm:w-10 sm:h-7 bg-[#f54502]/20 dark:bg-[#f54502]/30 rounded-[5px] flex items-center justify-center group-hover:scale-110 transition-transform">
        <FaPlus className="text-[#f54502]" />
      </div>
      <span>Add Another Ticket Option</span>
    </motion.button>
  );
});

const NavigationButtons = memo(function NavigationButtons({ 
  onBack, 
  onNext 
}: { 
  onBack: () => void; 
  onNext: () => void 
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-10">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onBack}
        className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                rounded-[5px] border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600
                transition-all duration-200 flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
      >
        <FaArrowLeft className="mr-2" />
        Go Back
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0 5px 20px rgba(124, 58, 237, 0.4)" }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white
                rounded-[5px] hover:from-[#f54502]/90 hover:to-[#d63a02]/90
                transition-all duration-300 shadow-lg hover:shadow-xl
                flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
      >
        Continue to Ticket Details
        <FaArrowRight className="ml-2" />
      </motion.button>
    </div>
  );
});

export default TicketSetup;