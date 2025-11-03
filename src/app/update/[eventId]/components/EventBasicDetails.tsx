import { motion } from "framer-motion";
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
      className="space-y-4 sm:space-y-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-[5px] shadow-md border border-gray-100 dark:border-gray-700"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
          Basic Details
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Fill in the essential information about your event
        </p>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Event Title */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Event Title
          </label>
          <input
            type="text"
            value={formData?.title || ""}
            onChange={(e) => handleInputChange(e, "title")}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="Enter event title..."
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Event Description
          </label>
          <textarea
            value={formData?.description || ""}
            onChange={(e) => handleInputChange(e, "description")}
            rows={4}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="Describe your event in detail..."
            required
          />
        </div>

        {/* Host Name */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Host Name
          </label>
          <input
            type="text"
            value={formData?.hostName || ""}
            onChange={(e) => handleInputChange(e, "hostName")}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="Enter host name"
            required
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Date */}
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
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