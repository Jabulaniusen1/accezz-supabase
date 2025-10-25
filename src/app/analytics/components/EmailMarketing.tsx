import React from 'react';
import { BiMailSend } from 'react-icons/bi';
import { motion } from 'framer-motion';

interface EmailMarketingProps {
  emailTitle: string;
  setEmailTitle: (value: string) => void;
  emailContent: string;
  setEmailContent: (value: string) => void;
  onSendEmail: () => void;
}

export const EmailMarketing: React.FC<EmailMarketingProps> = ({
  emailTitle,
  setEmailTitle,
  emailContent,
  setEmailContent,
  onSendEmail,
}) => (
  <div className="p-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
      <BiMailSend className="mr-2 text-yellow-500" />
      Email Attendees
    </h2>
    
    <div className="space-y-6">
      <div>
        <label htmlFor="emailTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Subject
        </label>
        <input
          id="emailTitle"
          type="text"
          value={emailTitle}
          onChange={(e) => setEmailTitle(e.target.value)}
          placeholder="Your email subject..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
        />
      </div>
      
      <div>
        <label htmlFor="emailContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Message
        </label>
        <textarea
          id="emailContent"
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
          placeholder="Write your message here..."
          rows={6}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
        />
      </div>
      
      <motion.button
        onClick={onSendEmail}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center"
      >
        <BiMailSend className="mr-2" />
        Send to Attendees
      </motion.button>
    </div>
  </div>
);