import React from 'react';
import { Send, Info } from 'lucide-react';

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
  <div className="max-w-xl space-y-4">
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
      <span>
        This message will be sent to all attendees currently shown in the Attendees tab.
        Apply filters to narrow the recipients before sending.
      </span>
    </div>

    <div className="space-y-1">
      <label htmlFor="emailTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Subject
      </label>
      <input
        id="emailTitle"
        type="text"
        value={emailTitle}
        onChange={(e) => setEmailTitle(e.target.value)}
        placeholder="Email subject…"
        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 transition"
      />
    </div>

    <div className="space-y-1">
      <label htmlFor="emailContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Message
      </label>
      <textarea
        id="emailContent"
        value={emailContent}
        onChange={(e) => setEmailContent(e.target.value)}
        placeholder="Write your message…"
        rows={6}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 transition"
      />
    </div>

    <button
      onClick={onSendEmail}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-medium rounded-lg transition"
    >
      <Send className="w-4 h-4" />
      Send to attendees
    </button>
  </div>
);
