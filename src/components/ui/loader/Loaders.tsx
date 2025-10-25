'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const Loader = () => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center space-y-4"
        >
          <div className="relative w-24 h-24">
            <Image
              src="/accezz logo.png"
              alt="Accezz Logo"
              fill
              className="object-contain"
            />
          </div>
          
          <div className="flex space-x-2">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0,
              }}
              className="w-3 h-3 bg-blue-500 rounded-full"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.2,
              }}
              className="w-3 h-3 bg-blue-500 rounded-full"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.4,
              }}
              className="w-3 h-3 bg-blue-500 rounded-full"
            />
          </div>
          
          <motion.p
            animate={{
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            Loading...
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Loader;
