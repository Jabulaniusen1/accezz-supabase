import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  message?: string;
  confirmText?: string;
  confirmButtonClass?: string;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  message,
  confirmText = 'Delete',
  confirmButtonClass = 'bg-red-500 hover:bg-red-600'
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        >
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {itemName}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message || `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`}
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;