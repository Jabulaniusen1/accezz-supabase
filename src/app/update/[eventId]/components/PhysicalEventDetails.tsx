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
      className="bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-gray-800 dark:to-gray-800/80 p-6 rounded-2xl shadow-xl border border-orange-100 dark:border-orange-900/30"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h3 className="text-xl font-semibold text-orange-700 dark:text-orange-300 mb-6 flex items-center">
        <FaMapMarkerAlt className="mr-2" />
        Physical Event Location
      </h3>

      <div className="space-y-6 dark:text-gray-100 text-gray-800">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-orange-600 dark:text-orange-400">
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 p-2 rounded-lg mr-3 shadow-lg">
              <FaMapMarkerAlt className="text-white text-lg" />
            </span>
            Location
          </label>
          <input
            type="text"
            value={formData?.location || ""}
            onChange={(e) => handleInputChange(e, "location")}
            className="w-full px-5 py-3.5 rounded-xl border border-orange-100/70 dark:border-orange-900/50 bg-white/80 dark:bg-gray-700/30 focus:bg-white dark:focus:bg-gray-800 backdrop-blur-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-900/50 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
            placeholder="e.g., New York, NY"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-orange-600 dark:text-orange-400">
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 p-2 rounded-lg mr-3 shadow-lg">
              <FaBuilding className="text-white text-lg" />
            </span>
            Venue
          </label>
          <input
            type="text"
            value={formData?.venue || ""}
            onChange={(e) => handleInputChange(e, "venue")}
            className="w-full px-5 py-3.5 rounded-xl border border-orange-100/70 dark:border-orange-900/50 bg-white/80 dark:bg-gray-700/30 focus:bg-white dark:focus:bg-gray-800 backdrop-blur-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-900/50 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
            placeholder="e.g., Madison Square Garden"
            required
          />
        </div>
      </div>
    </motion.div>
  );
}