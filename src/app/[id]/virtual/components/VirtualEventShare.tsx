import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaShareAlt, FaCopy, FaLinkedin, FaTwitter, FaFacebook, FaLink } from 'react-icons/fa';
// import { Button } from '@mui/material';
import { SiWhatsapp, SiTelegram } from 'react-icons/si';
import { MdEmail } from 'react-icons/md';

interface VirtualEventShareProps {
  event: Event;
}

export default function VirtualEventShare({ event }: VirtualEventShareProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'social'>('link');
  const eventUrl = `${window.location.origin}/${event.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: string) => {
    let url = '';
    const text = `Join me at ${event.title}!`;

    switch(platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${text} ${eventUrl}`)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`Invitation to ${event.title}`)}&body=${encodeURIComponent(`${text}\n\n${eventUrl}`)}`;
        break;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* SHARE HEADER WITH ANIMATED ICONS */}
      <div className="relative bg-gradient-to-r from-teal-500 to-blue-600 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern/overcast.svg')] opacity-20" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <h2 className="text-2xl font-bold text-white relative z-10 flex items-center">
          <FaShareAlt className="mr-3 text-teal-200" />
          SHARE THIS EVENT
        </h2>
      </div>

      <div className="p-6">
        {/* TAB NAVIGATION */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'link' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <FaLink className="mr-2" /> Copy Link
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'social' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <FaShareAlt className="mr-2" /> Social Share
          </button>
        </div>

        {activeTab === 'link' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <div className="truncate text-gray-800 dark:text-gray-200 text-sm">
                {eventUrl}
              </div>
              <button 
                onClick={copyToClipboard}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors flex items-center"
              >
                <FaCopy className="mr-1" /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Share this link with friends and colleagues who might be interested in this virtual event.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => shareOnSocial('twitter')}
              className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex flex-col items-center justify-center"
            >
              <FaTwitter className="text-blue-400 text-2xl mb-2" />
              <span className="text-sm font-medium">Twitter</span>
            </button>
            <button
              onClick={() => shareOnSocial('facebook')}
              className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex flex-col items-center justify-center"
            >
              <FaFacebook className="text-blue-600 text-2xl mb-2" />
              <span className="text-sm font-medium">Facebook</span>
            </button>
            <button
              onClick={() => shareOnSocial('linkedin')}
              className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex flex-col items-center justify-center"
            >
              <FaLinkedin className="text-blue-700 text-2xl mb-2" />
              <span className="text-sm font-medium">LinkedIn</span>
            </button>
            <button
              onClick={() => shareOnSocial('whatsapp')}
              className="p-4 rounded-xl bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex flex-col items-center justify-center"
            >
              <SiWhatsapp className="text-green-500 text-2xl mb-2" />
              <span className="text-sm font-medium">WhatsApp</span>
            </button>
            <button
              onClick={() => shareOnSocial('telegram')}
              className="p-4 rounded-xl bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex flex-col items-center justify-center"
            >
              <SiTelegram className="text-blue-500 text-2xl mb-2" />
              <span className="text-sm font-medium">Telegram</span>
            </button>
            <button
              onClick={() => shareOnSocial('email')}
              className="p-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex flex-col items-center justify-center"
            >
              <MdEmail className="text-gray-600 dark:text-gray-300 text-2xl mb-2" />
              <span className="text-sm font-medium">Email</span>
            </button>
          </div>
        )}

        <div className="mt-6 bg-teal-50 dark:bg-teal-900/10 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            The more you share, the better the experience! Virtual events are more fun with friends and colleagues.
          </p>
        </div>
      </div>
    </motion.div>
  );
}