import { motion } from "framer-motion";
import { FaTrash } from "react-icons/fa";
import { Event } from "../../../../types/event";
import AttendeesList from "./AttendeesList";

interface TicketTypeCardProps {
  ticket: Event["ticketType"][number];
  ticketIndex: number;
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
  onDelete: () => void;
}

export default function TicketTypeCard({ 
  ticket, 
  ticketIndex, 
  formData, 
  setFormData,
  onDelete 
}: TicketTypeCardProps) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    if (!formData) return;
    const updatedTickets = [...formData.ticketType];
    updatedTickets[ticketIndex] = {
      ...updatedTickets[ticketIndex],
      [field]: e.target.value,
    };
    setFormData({ ...formData, ticketType: updatedTickets });
  };

  const handleFeatureChange = (index: number, value: string) => {
    if (!formData) return;
    const newFeatures = ticket.details?.split('\n') || [];
    newFeatures[index] = value;
    const updatedTickets = [...formData.ticketType];
    updatedTickets[ticketIndex] = {
      ...ticket,
      details: newFeatures.join('\n')
    };
    setFormData({ ...formData, ticketType: updatedTickets });
  };

  const handleAddFeature = () => {
    if (!formData) return;
    const currentFeatures = ticket.details || '';
    const updatedTickets = [...formData.ticketType];
    updatedTickets[ticketIndex] = {
      ...ticket,
      details: currentFeatures + '\n'
    };
    setFormData({ ...formData, ticketType: updatedTickets });
  };

  const handleRemoveFeature = (index: number) => {
    if (!formData) return;
    const newFeatures = ticket.details?.split('\n').filter((_, i) => i !== index) || [];
    const updatedTickets = [...formData.ticketType];
    updatedTickets[ticketIndex] = {
      ...ticket,
      details: newFeatures.join('\n')
    };
    setFormData({ ...formData, ticketType: updatedTickets });
  };

  return (
    <motion.div
      className="border border-gray-200 dark:border-gray-700 rounded-[5px] overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: ticketIndex * 0.1 }}
    >
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
            {ticket.name || `Ticket Type ${ticketIndex + 1}`}
          </span>
          <span className="px-2 sm:px-3 py-1 bg-[#f54502]/20 dark:bg-[#f54502]/30 text-[#f54502] dark:text-[#f54502] rounded-[5px] text-xs sm:text-sm">
            N{ticket.price}
          </span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#f54502] hover:text-[#d63a02] dark:hover:text-[#d63a02] transition-colors"
        >
          <FaTrash size={14} />
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ticket Name
            </label>
            <input
              type="text"
              name="name"
              value={ticket.name}
              onChange={(e) => handleInputChange(e, "name")}
              className="w-full px-3 sm:px-4 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600
                  focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
              placeholder="e.g., VIP, Regular"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={ticket.quantity}
                onChange={(e) => handleInputChange(e, "quantity")}
                className="w-full px-3 sm:px-4 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600
                    focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price
              </label>
              <input
                type="number"
                name="price"
                value={ticket.price}
                onChange={(e) => handleInputChange(e, "price")}
                className="w-full px-3 sm:px-4 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ticket Features
          </label>
          <div className="space-y-2">
            {(ticket.details || '').split('\n').map((feature: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-[#f54502]">•</span>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 rounded-[5px] border border-gray-300 dark:border-gray-600
                       focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Add a feature..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="text-[#f54502] hover:text-[#d63a02] dark:hover:text-[#d63a02]"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddFeature}
              className="text-xs sm:text-sm text-[#f54502] hover:text-[#d63a02] dark:text-[#f54502] dark:hover:text-[#d63a02] mt-2"
            >
              + Add Feature
            </button>
          </div>
        </div>

        <AttendeesList
          ticketIndex={ticketIndex}
          formData={formData}
          setFormData={setFormData}
        />
      </div>
    </motion.div>
  );
}