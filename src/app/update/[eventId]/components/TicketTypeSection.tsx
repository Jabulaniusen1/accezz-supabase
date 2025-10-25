import { motion } from "framer-motion";
import { FaTicketAlt} from "react-icons/fa";
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 flex items-center">
          <FaTicketAlt className="mr-2 text-blue-500" />
          Ticket Types
        </h2>
        <motion.button
          type="button"
          onClick={handleAddTicketType}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl 
               shadow-lg hover:shadow-purple-500/20 transition-all duration-200"
          whileHover={{
            scale: 1.05,
            boxShadow: "0 20px 25px -5px rgba(147, 51, 234, 0.2)",
          }}
          whileTap={{ scale: 0.98 }}
        >
          Add Ticket Type
        </motion.button>
      </div>

      <div className="space-y-6">
        {formData?.ticketType?.map((ticket, ticketIndex) => (
          <TicketTypeCard
            key={ticketIndex}
            ticket={ticket}
            ticketIndex={ticketIndex}
            formData={formData}
            setFormData={setFormData}
            onDelete={() => handleDeleteTicketType(ticketIndex)}
          />
        ))}
      </div>
    </motion.div>
  );
}