import { motion } from "framer-motion";
import { RiTicketLine } from "react-icons/ri";
import { useEffect, useRef } from "react";
import { Event } from "../../../../types/event";
import TicketTypeCard from "./TicketTypeCard";

interface TicketTypesSectionProps {
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
}

export default function TicketTypesSection({ 
  formData, 
  setFormData 
}: TicketTypesSectionProps) {
  const ticketCardsRef = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const previousTicketCountRef = useRef<number>(0);

  const handleAddTicketType = () => {
    if (!formData) return;
    const newTicket = { 
      name: "", 
      sold: "0", 
      price: "", 
      quantity: "",
      details: "",
      attendees: [] 
    };
    setFormData({
      ...formData,
      ticketType: [...formData.ticketType, newTicket],
    });
  };

  // Scroll to newly added ticket
  useEffect(() => {
    const currentTicketCount = formData?.ticketType?.length || 0;
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
          
          // Focus on the ticket name input
          const nameInput = newTicketCard.querySelector<HTMLInputElement>('input[name="name"]');
          if (nameInput) {
            setTimeout(() => nameInput.focus(), 300);
          }
        }
      }, 100);
    }

    // Update the previous count
    previousTicketCountRef.current = currentTicketCount;
  }, [formData?.ticketType?.length]);

  const handleDeleteTicketType = (index: number) => {
    if (!formData) return;
    const updatedTickets = formData.ticketType.filter((_, i) => i !== index);
    setFormData({ ...formData, ticketType: updatedTickets });
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#f54502] dark:text-[#f54502] flex items-center">
          <RiTicketLine className="mr-2 text-[#f54502]" />
          Ticket Types
        </h2>
        <motion.button
          type="button"
          onClick={handleAddTicketType}
          className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#f54502] hover:bg-[#d63a02] text-white rounded-[5px] 
               shadow-lg transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
          whileHover={{
            scale: 1.05,
            boxShadow: "0 20px 25px -5px rgba(245, 69, 2, 0.2)",
          }}
          whileTap={{ scale: 0.98 }}
        >
          Add Ticket Type
        </motion.button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {formData?.ticketType?.map((ticket, ticketIndex) => (
          <div
            key={ticketIndex}
            ref={(el) => {
              ticketCardsRef.current[ticketIndex] = el;
            }}
          >
            <TicketTypeCard
              ticket={ticket}
              ticketIndex={ticketIndex}
              formData={formData}
              setFormData={setFormData}
              onDelete={() => handleDeleteTicketType(ticketIndex)}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}