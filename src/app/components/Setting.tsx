import React, { useState } from 'react';
import Notifications from './settings/Notification';
import Account from './settings/Account';
import Wallet from './settings/Wallet';


const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className='flex flex-col px-0 sm:px-10 h-full w-full sm:max-w-full'>
      
      <div className="mb-8">
        <h1 className='text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2'>
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
          Manage your account preferences and security settings
        </p>
      </div>

      {/* Improved Tab Navigation */}
      <div className="overflow-x-auto mb-8">
        <div className="flex min-w-max border-b border-gray-200 dark:border-gray-700">
          {[
        { name: 'Account', id: 0 },
        { name: 'Wallet', id: 1 },
        { name: 'Notifications', id: 2 },
          ].map((tab) => (
        <button
          key={tab.id}
          className={`
          py-3 px-4 lg:px-8 text-sm lg:text-base 
          whitespace-nowrap
          rounded-t-lg font-medium transition-all duration-200
          ${activeTab === tab.id
          ? 'bg-white dark:bg-gray-800 text-[#f54502] dark:text-[#f54502] border-b-2 border-[#f54502] shadow-sm'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
          `}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.name}
        </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className='flex-1'>
      {activeTab === 0 && <Account />}
      {activeTab === 1 && <Wallet />}
      {activeTab === 2 && <Notifications />}
      </div>
    </div>
  );
};

export default Settings;




