import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion } from 'framer-motion';

interface QRCodeCardProps {
  eventSlug?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ eventSlug }) => (
  <motion.div 
    className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-yellow-500"
    whileHover={{ scale: 1.02 }}
  >
    <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-yellow-500"></div>
    <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-yellow-500"></div>
    <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-yellow-500"></div>
    <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-yellow-500"></div>
    
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
      Event Check-In QR
    </h3>
    
    <div className="flex justify-center p-4 bg-white rounded-lg">
      <QRCodeCanvas
        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${eventSlug}`}
        size={160}
        level="H"
        fgColor="#000000"
        bgColor="#ffffff"
        includeMargin={false}
      />
    </div>
    
    <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
      Scan this code at the event entrance
    </p>
    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
      Valid for {eventSlug || 'this event'}
    </p>
  </motion.div>
);