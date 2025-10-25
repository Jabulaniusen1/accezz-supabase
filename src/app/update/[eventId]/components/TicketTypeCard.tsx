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
      className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: ticketIndex * 0.1 }}
    >
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-medium text-gray-900 dark:text-white">
            {ticket.name || `Ticket Type ${ticketIndex + 1}`}
          </span>
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
            ${ticket.price}
          </span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
        >
          <FaTrash size={16} />
        </button>
      </div>

      <div className="p-6 space-y-6 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ticket Name
            </label>
            <input
              type="text"
              name="name"
              value={ticket.name}
              onChange={(e) => handleInputChange(e, "name")}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., VIP, Regular"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={ticket.quantity}
                onChange={(e) => handleInputChange(e, "quantity")}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price
              </label>
              <input
                type="number"
                name="price"
                value={ticket.price}
                onChange={(e) => handleInputChange(e, "price")}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ticket Features
          </label>
          <div className="space-y-2">
            {(ticket.details || '').split('\n').map((feature: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-blue-500">•</span>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Add a feature..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddFeature}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400
                 dark:hover:text-blue-300 mt-2"
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