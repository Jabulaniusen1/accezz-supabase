import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  borderColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  icon, 
  children,
  borderColor = 'border-yellow-500'
}) => (
  <motion.div 
    className={`p-6 rounded-xl shadow-sm border-l-4 ${borderColor} bg-white dark:bg-gray-800`}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
  >
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <div className="text-2xl text-yellow-500">{icon}</div>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </motion.div>
);