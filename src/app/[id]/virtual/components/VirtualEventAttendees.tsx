// COMPONENTS/VIRTUAL-EVENT/VIRTUAL-EVENT-ATTENDEES.TSX
import React from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaUserFriends } from 'react-icons/fa';
import Image from 'next/image';

interface VirtualEventAttendeesProps {
  event: Event;
}

export default function VirtualEventAttendees({ event }: VirtualEventAttendeesProps) {
  // Sample attendees - in a real app, this would come from your API
  const sampleAttendees = [
    { name: 'Alex Johnson', avatar: '/avatars/1.jpg' },
    { name: 'Sarah Williams', avatar: '/avatars/2.jpg' },
    { name: 'Michael Brown', avatar: '/avatars/3.jpg' },
    { name: 'Emily Davis', avatar: '/avatars/4.jpg' },
    { name: 'David Wilson', avatar: '/avatars/5.jpg' },
  ];

  const totalAttendees = event.ticketType.reduce((sum, ticket) => sum + parseInt(ticket.sold), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <FaUserFriends className="mr-2 text-purple-500" />
        WHO&apos;S ATTENDING ({totalAttendees})
      </h3>

      <div className="flex flex-wrap gap-3 mb-4">
        {sampleAttendees.map((attendee, index) => (
          <div key={index} className="relative group">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
              <Image
                src={attendee.avatar}
                alt={attendee.name}
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {attendee.name}
            </div>
          </div>
        ))}
        {totalAttendees > 5 && (
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 font-medium">
            +{totalAttendees - 5}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Connect with other attendees in our virtual networking lounge before the event starts!
        </p>
      </div>
    </motion.div>
  );
}