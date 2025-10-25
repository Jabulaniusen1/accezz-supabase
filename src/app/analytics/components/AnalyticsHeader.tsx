import React from 'react';
import { FiHome, FiShare2 } from 'react-icons/fi';
import Link from 'next/link';
import ToggleMode from '@/components/ui/mode/toggleMode';
// import { format } from 'date-fns';
// import { FaMoneyBill } from 'react-icons/fa';

interface AnalyticsHeaderProps {
  title: string;
  onShare: () => void;
  eventDate?: string;
  totalPaidAttendees: number;
  totalRevenue: number;
  currency?: string;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ 
  title, 
  onShare,
  // eventDate,
  // totalPaidAttendees = 0, 
  // totalRevenue = 0,
  // currency = 'NGN' 
}) => {
  // Log revenue and attendees to console
  // console.log('Omor Revenue:', totalRevenue, 'Currency:', currency);
  // console.log('Omor Attendees:', totalPaidAttendees);
  
  // const formattedDate = eventDate 
  //   ? format(new Date(eventDate), 'MMM d, yyyy')
  //   : 'Not specified';

  // const getCurrencySymbol = (currencyCode: string) => {
  //   const symbols: Record<string, string> = {
  //     NGN: '₦',
  //     USD: '$',
  //     EUR: '€',
  //     GBP: '£'
  //   };
  //   return symbols[currencyCode] || currencyCode + ' ';
  // };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-2">
            <Link 
              href="/dashboard" 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Return to dashboard"
            >
              <FiHome className="text-gray-700 dark:text-gray-300" />
            </Link>
            <h1 className="lg:text-lg text-base lg:font-bold font-semibold text-gray-900 dark:text-white truncate lg:max-w-full max-w-[150px]">
              {title}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <ToggleMode />
            <button 
              onClick={onShare} 
              className="p-2 bg-yellow-500 hover:bg-yellow-400 text-white rounded-lg transition-colors"
              aria-label="Share event"
            >
              <FiShare2 />
            </button>
          </div>
        </div>
        
        {/* <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="p-1 mr-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-400">
              <FiCalendar size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate lg:max-w-[120px] max-w-[70px]">
                {formattedDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="p-1 mr-2 rounded-full bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-400">
              <FiUsers size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Attendees</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {totalPaidAttendees.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="p-1 mr-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-500 dark:text-purple-400">
              <FaMoneyBill size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getCurrencySymbol(currency)}{totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </header>
  );
};