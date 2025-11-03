import ToggleMode from "@/components/ui/mode/toggleMode";
import { motion } from "framer-motion";
import { BiArrowBack } from "react-icons/bi";

interface EventHeaderProps {
  onBack: () => void;
}

export default function EventHeader({ onBack }: EventHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <motion.button
        onClick={onBack}
        className="flex items-center space-x-1 sm:space-x-2 text-gray-600 dark:text-gray-300 hover:text-[#f54502] dark:hover:text-[#f54502] transition-colors text-sm sm:text-base"
        whileHover={{ scale: 1.05 }}
      >
        <BiArrowBack className="text-lg sm:text-xl" />
        <span className="hidden sm:inline">Back to Dashboard</span>
        <span className="sm:hidden">Back</span>
      </motion.button>
      <ToggleMode />
    </div>
  );
}