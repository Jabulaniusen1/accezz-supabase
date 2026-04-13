import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2 } from 'lucide-react';
import ToggleMode from '@/components/ui/mode/toggleMode';

interface AnalyticsHeaderProps {
  title: string;
  onShare: () => void;
  eventDate?: string;
  totalPaidAttendees: number;
  totalRevenue: number;
  currency?: string;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ title, onShare }) => (
  <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-xs lg:max-w-md">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ToggleMode />
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Share event"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
    </div>
  </header>
);
