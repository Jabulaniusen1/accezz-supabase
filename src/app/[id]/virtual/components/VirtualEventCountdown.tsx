import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';

interface VirtualEventCountdownProps {
  event: Event;
}

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
};

export default function VirtualEventCountdown({ event }: VirtualEventCountdownProps) {
  // STATE TO TRACK TIME LEFT UNTIL EVENT STARTS
  const defaultCountdownState: CountdownState = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false
  };

  const [timeLeft, setTimeLeft] = useState<CountdownState>(defaultCountdownState);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();

      if (!event?.date) {
        return { ...defaultCountdownState };
      }

      const eventDateTime = new Date(event.date);
      if (isNaN(eventDateTime.getTime())) {
        return { ...defaultCountdownState };
      }

      let hours: number | null = null;
      let minutes: number | null = null;

      if (event.time) {
        const parts = event.time.split(':');
        if (parts.length >= 2) {
          const parsedHour = parseInt(parts[0], 10);
          const parsedMinute = parseInt(parts[1], 10);
          if (!Number.isNaN(parsedHour) && !Number.isNaN(parsedMinute)) {
            hours = parsedHour;
            minutes = parsedMinute;
          }
        }
      } else if (event.startTime) {
        const startTimeDate = new Date(event.startTime);
        if (!Number.isNaN(startTimeDate.getTime())) {
          hours = startTimeDate.getHours();
          minutes = startTimeDate.getMinutes();
        }
      }

      if (hours === null || minutes === null) {
        return { ...defaultCountdownState };
      }

      // COMBINE DATE AND TIME STRINGS INTO A VALID ISO STRING
      eventDateTime.setHours(hours, minutes, 0, 0); // SET TIME PROPERLY

      // CHECK IF PARSED DATE IS VALID
      if (isNaN(eventDateTime.getTime())) {
        return { ...defaultCountdownState };
      }

      // CALCULATE DIFFERENCE IN SECONDS
      const diffInSeconds = Math.floor((eventDateTime.getTime() - now.getTime()) / 1000);

      // IF TIME HAS PASSED, MARK EVENT AS LIVE
      if (diffInSeconds <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
      }

      // BREAK DOWN INTO DAYS, HOURS, MINUTES, SECONDS
      const remainingDays = Math.floor(diffInSeconds / (60 * 60 * 24));
      const remainingHours = Math.floor((diffInSeconds % (60 * 60 * 24)) / (60 * 60));
      const remainingMinutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
      const remainingSeconds = Math.floor(diffInSeconds % 60);

      return {
        days: remainingDays,
        hours: remainingHours,
        minutes: remainingMinutes,
        seconds: remainingSeconds,
        isLive: false
      };
    };

    // START INTERVAL TO UPDATE COUNTDOWN EVERY 1 SECOND
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // CLEAN UP ON UNMOUNT
    return () => clearInterval(timer);
  }, [event.date, event.time, event.startTime]);

  // FORMAT DATE NICELY FOR DISPLAY
  const formattedDate = event.date ? format(parseISO(event.date), 'MMMM do, yyyy') : '';
  let formattedTime = event.time || '';

  if (!formattedTime && event.startTime) {
    const start = new Date(event.startTime);
    if (!Number.isNaN(start.getTime())) {
      formattedTime = format(start, 'HH:mm');
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-[#f54502]/15 dark:border-[#f54502]/25"
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
            <FaCalendarAlt className="mr-2 text-[#f54502]" />
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
            <div key={index} className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 rounded-lg">
              <div className="text-2xl font-bold text-[#f54502] dark:text-[#f54502]">
                {item.value.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* SHOW EVENT DATE AND TIME */}
      <div className="mt-4 flex items-center text-gray-600 dark:text-gray-300">
        <FaClock className="mr-2 text-[#f54502]" />
        {formattedDate}
        {formattedTime ? ` at ${formattedTime}` : ''}
      </div>
    </motion.div>
  );
}
