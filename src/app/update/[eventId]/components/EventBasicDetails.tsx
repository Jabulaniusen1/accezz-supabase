import { motion } from "framer-motion";
import { FaUserPlus, FaCalendarAlt, FaClock, FaHeading, FaAlignLeft } from "react-icons/fa";
import { Event } from "../../../../types/event";
import DateTimePicker from "@/components/ui/DateTimePicker";

interface EventBasicDetailsProps {
  formData: Event | null;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string
  ) => void;
}

export default function EventBasicDetails({ 
  formData, 
  handleInputChange 
}: EventBasicDetailsProps) {

  return (
    <motion.div
      className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
          Basic Details
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Fill in the essential information about your event
        </p>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Event Title */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="bg-blue-500 p-2 rounded-lg mr-3 text-white">
              <FaHeading className="text-lg" />
            </span>
            Event Title
          </label>
          <input
            type="text"
            value={formData?.title || ""}
            onChange={(e) => handleInputChange(e, "title")}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter event title..."
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="bg-blue-500 p-2 rounded-lg mr-3 text-white">
              <FaAlignLeft className="text-lg" />
            </span>
            Event Description
          </label>
          <textarea
            value={formData?.description || ""}
            onChange={(e) => handleInputChange(e, "description")}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Describe your event in detail..."
            required
          />
        </div>

        {/* Host Name */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="bg-blue-500 p-2 rounded-lg mr-3 text-white">
              <FaUserPlus className="text-lg" />
            </span>
            Host Name
          </label>
          <input
            type="text"
            value={formData?.hostName || ""}
            onChange={(e) => handleInputChange(e, "hostName")}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter host name"
            required
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          {/* Date */}
          <div className="space-y-3">
            <label className="flex items-center text-sm font-medium text-indigo-700 dark:text-indigo-300">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 rounded-xl mr-2 shadow-md">
          <FaCalendarAlt className="text-white text-lg" />
              </span>
              Date
            </label>
            {/* Use DateTimePicker for date */}
            <DateTimePicker
              type="date"
              value={formData?.date || ""}
              onChange={(value) =>
          handleInputChange(
            { target: { value } } as React.ChangeEvent<HTMLInputElement>,
            "date"
          )
              }
              minDate={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
          </div>

          {/* Time */}
          <div className="space-y-3">
            <label className="flex items-center text-sm font-medium text-indigo-700 dark:text-indigo-300">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2.5 rounded-xl mr-2 shadow-md">
          <FaClock className="text-white text-lg" />
              </span>
              Time
            </label>
            {/* Use DateTimePicker for time */}
            <DateTimePicker
              type="time"
              value={formData?.time || ""}
              onChange={(value) =>
          handleInputChange(
            { target: { value } } as React.ChangeEvent<HTMLInputElement>,
            "time"
          )
              }
              className="w-full"
            />
          </div>
        </div>
        {/* 
          NOTE: 
          To stop automatic updating and redirecting to dashboard, 
          you need to remove or modify the redirect logic in the parent component (page.tsx) 
          after a successful update. This component only handles the form fields.
        */}
      </div>
    </motion.div>
  );
}