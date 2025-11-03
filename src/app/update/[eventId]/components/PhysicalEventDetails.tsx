import { motion } from "framer-motion";
import { FaMapMarkerAlt, FaBuilding } from "react-icons/fa";
import { Event } from "../../../../types/event";

interface PhysicalEventDetailsProps {
  formData: Event | null;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string
  ) => void;
}

export default function PhysicalEventDetails({ 
  formData, 
  handleInputChange 
}: PhysicalEventDetailsProps) {
  return (
    <motion.div
      className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-4 sm:p-6 rounded-[5px] shadow-xl border border-[#f54502]/20 dark:border-[#f54502]/30"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h3 className="text-lg sm:text-xl font-semibold text-[#f54502] dark:text-[#f54502] mb-4 sm:mb-6 flex items-center">
        <FaMapMarkerAlt className="mr-2 text-sm sm:text-base" />
        Physical Event Location
      </h3>

      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Location
          </label>
          <input
            type="text"
            value={formData?.location || ""}
            onChange={(e) => handleInputChange(e, "location")}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="e.g., New York, NY"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Venue
          </label>
          <input
            type="text"
            value={formData?.venue || ""}
            onChange={(e) => handleInputChange(e, "venue")}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="e.g., Madison Square Garden"
            required
          />
        </div>
      </div>
    </motion.div>
  );
}