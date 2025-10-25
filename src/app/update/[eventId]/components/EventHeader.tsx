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
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        whileHover={{ scale: 1.05 }}
      >
        <BiArrowBack className="text-xl" />
        <span>Back to Dashboard</span>
      </motion.button>
      <ToggleMode />
    </div>
  );
}