'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentFailedModalProps {
  onClose: () => void;
  onTryAgain?: () => void;
}

const PaymentFailedModal = ({ onClose, onTryAgain }: PaymentFailedModalProps) => {
  const handleContactSupport = () => {
    window.location.href = 'mailto:accezzlive@gmail.com?subject=Payment Issue';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Failed icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
              <motion.svg
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.1, type: "spring" }}
                className="w-16 h-16 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </motion.svg>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">
            Payment Failed
          </h2>

          {/* Message */}
          <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
            We couldn&apos;t process your payment. This could be due to a connection issue,
            insufficient funds, or the transaction was cancelled.
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContactSupport}
              className="w-full bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white font-medium py-3 px-6 rounded-lg hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transition-all duration-200 hover:shadow-lg"
            >
              Contact Support
            </button>
            
            {onTryAgain && (
              <button
                onClick={onTryAgain}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              >
                Try Again
              </button>
            )}
          </div>

          {/* Support info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Need immediate help? Email us at{' '}
              <a href="mailto:accezzlive@gmail.com" className="text-[#f54502] hover:underline">
                accezzlive@gmail.com
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentFailedModal;

