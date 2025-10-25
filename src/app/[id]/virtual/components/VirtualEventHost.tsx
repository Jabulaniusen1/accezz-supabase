import React from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaUserTie, FaLinkedin, FaTwitter, FaGlobe } from 'react-icons/fa';
import Image from 'next/image';

interface VirtualEventHostProps {
  event: Event;
}

export default function VirtualEventHost({ event }: VirtualEventHostProps) {
  const socialLinks = event.socialMediaLinks || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      <div className="relative bg-gradient-to-r from-indigo-500 to-green-200 p-3">
        <div className="absolute inset-0 bg-[url('/pattern/overcast.svg')] opacity-20" />
        
        <h2 className="text-2xl font-bold text-white relative z-10 flex items-center">
          <FaUserTie className="mr-3 text-indigo-200" />
          YOUR HOST
        </h2>
      </div>

      <div className="p-5">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg mb-4 overflow-hidden bg-gray-200 dark:bg-gray-700">
            {event.image ? (
              <Image
                src={typeof event.image === 'string' ? event.image : URL.createObjectURL(event.image)}
                alt={event.hostName}
                width={96}
                height={96}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <FaUserTie className="text-3xl" />
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{event.hostName}</h3>
          <p className="text-blue-600 dark:text-blue-400">Event Host</p>
        </div>

        <div className="flex justify-center space-x-4">
          {socialLinks.linkedin && (
            <a 
              href={socialLinks.linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <FaLinkedin className="text-lg" />
            </a>
          )}
          {socialLinks.twitter && (
            <a 
              href={socialLinks.twitter} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <FaTwitter className="text-lg" />
            </a>
          )}
          {socialLinks.instagram && (
            <a 
              href={socialLinks.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              <FaGlobe className="text-lg" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}