import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';

interface VirtualEventCountdownProps {
  event: Event;
}

export default function VirtualEventCountdown({ event }: VirtualEventCountdownProps) {
  // STATE TO TRACK TIME LEFT UNTIL EVENT STARTS
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();

      // COMBINE DATE AND TIME STRINGS INTO A VALID ISO STRING
      const [hour, minute] = event.time.split(':');
      const eventDateTime = new Date(event.date);
      eventDateTime.setHours(parseInt(hour), parseInt(minute), 0); // SET TIME PROPERLY

      // CHECK IF PARSED DATE IS VALID
      if (isNaN(eventDateTime.getTime())) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false };
      }

      // CALCULATE DIFFERENCE IN SECONDS
      const diffInSeconds = Math.floor((eventDateTime.getTime() - now.getTime()) / 1000);

      // IF TIME HAS PASSED, MARK EVENT AS LIVE
      if (diffInSeconds <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
      }

      // BREAK DOWN INTO DAYS, HOURS, MINUTES, SECONDS
      const days = Math.floor(diffInSeconds / (60 * 60 * 24));
      const hours = Math.floor((diffInSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
      const seconds = Math.floor(diffInSeconds % 60);

      return { days, hours, minutes, seconds, isLive: false };
    };

    // START INTERVAL TO UPDATE COUNTDOWN EVERY 1 SECOND
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // CLEAN UP ON UNMOUNT
    return () => clearInterval(timer);
  }, [event.date, event.time]);

  // FORMAT DATE NICELY FOR DISPLAY
  const formattedDate = event.date ? format(parseISO(event.date), 'MMMM do, yyyy') : '';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center">
        {timeLeft.isLive ? (
          <>
            {/* LIVE INDICATOR */}
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            EVENT IS LIVE NOW!
          </>
        ) : (
          <>
            {/* COUNTDOWN LABEL */}
            <FaCalendarAlt className="mr-2 text-blue-500" />
            EVENT STARTS IN
          </>
        )}
      </h3>

      {/* CONDITIONAL COUNTDOWN DISPLAY */}
      {timeLeft.isLive ? (
        <div className="text-center py-4">
          <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full font-medium">
            JOIN NOW TO PARTICIPATE
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { value: timeLeft.days, label: 'DAYS' },
            { value: timeLeft.hours, label: 'HOURS' },
            { value: timeLeft.minutes, label: 'MINUTES' },
            { value: timeLeft.seconds, label: 'SECONDS' }
          ].map((item, index) => (
            <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {item.value.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* SHOW EVENT DATE AND TIME */}
      <div className="mt-4 flex items-center text-gray-600 dark:text-gray-300">
        <FaClock className="mr-2" />
        {formattedDate} at {event.time}
      </div>
    </motion.div>
  );
}
