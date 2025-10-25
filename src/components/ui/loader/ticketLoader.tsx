'use client';
import React from 'react';
import { motion } from 'framer-motion';



const TicketLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ 
                    scale: [0.8, 1, 0.8],
                    rotate: [0, 5, -5, 0]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="relative"
            >
                {/* Ticket shape */}
                <div className="w-16 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg shadow-lg relative">
                    {/* Ticket holes */}
                    <div className="absolute top-2 left-2 w-2 h-2 bg-white rounded-full opacity-70"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full opacity-70"></div>
                    {/* Ticket stripes */}
                    <div className="absolute top-8 left-2 right-2 h-1 bg-white opacity-30 rounded"></div>
                    <div className="absolute top-12 left-2 right-2 h-1 bg-white opacity-30 rounded"></div>
                    <div className="absolute top-16 left-2 right-2 h-1 bg-white opacity-30 rounded"></div>
                </div>
            </motion.div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="mt-4 text-gray-200 font-medium text-sm"
            >
                Loading ticket details...
            </motion.p>
        </div>
    );
};

export default TicketLoader;