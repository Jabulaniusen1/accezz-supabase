import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { FaCalendarAlt, FaClock, FaInfoCircle } from 'react-icons/fa';
import { MdOutlineDescription } from 'react-icons/md';
import { FiUsers } from 'react-icons/fi';
import { BsFillLightningChargeFill } from 'react-icons/bs';
import { type Event } from '@/types/event';

interface VirtualEventDetailsProps {
  event: Event;
}

const sections = [
  { key: 'datetime', label: 'Schedule', icon: <FaCalendarAlt /> },
  { key: 'description', label: 'Overview', icon: <MdOutlineDescription /> },
  { key: 'audience', label: 'Who’s Coming', icon: <FiUsers /> },
];

export default function VirtualEventDetails({ event }: VirtualEventDetailsProps) {
  const [active, setActive] = useState<string | null>(null);
  const formattedDate = format(new Date(event.date), 'MMMM do, yyyy');

  const toggle = (key: string) => setActive(active === key ? null : key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className="relative p-6 bg-white/80 dark:bg-gray-800/70 backdrop-blur-md rounded-3xl shadow-2xl max-w-3xl mx-auto mt-8 border border-gray-300 dark:border-gray-700"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full shadow-lg">
            <FaInfoCircle className="text-white text-3xl" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
          {event.title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
          Get ready to dive in and experience something unforgettable.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(({ key, label, icon }) => (
          <motion.div
            key={key}
            layout
            initial={{ borderRadius: 20 }}
            className={`p-5 rounded-2xl cursor-pointer transition-colors ${
              active === key
                ? 'bg-gradient-to-tr from-blue-100/60 to-purple-100/40 dark:from-blue-900/30 dark:to-purple-900/20'
                : 'bg-white/70 dark:bg-gray-700/50'
            }`}
            onClick={() => toggle(key)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-blue-500 dark:text-purple-400 text-2xl">{icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{label}</h3>
              </div>
              <motion.div
                animate={{ rotate: active === key ? 90 : 0 }}
                transition={{ type: 'tween', duration: 0.3 }}
              >
                <BsFillLightningChargeFill className="text-gray-400 dark:text-gray-500" />
              </motion.div>
            </div>

            {/* Content Expand */}
            <AnimatePresence>
              {active === key && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 pl-8 text-gray-600 dark:text-gray-300 text-sm space-y-2"
                >
                  {key === 'datetime' && (
                    <>
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-blue-400" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaClock className="text-blue-400" />
                        <span>{event.time}</span>
                      </div>
                      <div className="mt-3 text-xs italic text-gray-500 dark:text-gray-400">
                        * Adjusted automatically to your timezone
                      </div>
                    </>
                  )}
                  {key === 'description' && <p>{event.description || 'Stay tuned for more details!'}</p>}
                  {key === 'audience' && (
                    <p>
                      Expect a vibrant mix of enthusiasts, professionals, creators, and innovators coming
                      together to make magic happen around <strong>{event.title}</strong>!
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
