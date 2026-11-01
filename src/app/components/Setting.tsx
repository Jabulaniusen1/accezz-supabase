import React, { useState } from 'react';
import Notifications from './settings/Notification';
import Account from './settings/Account';


const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className='flex flex-col h-full w-full'>

      {/* Improved Tab Navigation */}
      <div className="overflow-x-auto mb-8">
        <div className="flex min-w-max border-b border-gray-200 dark:border-gray-700">
          {[
        { name: 'Account', id: 0 },
        { name: 'Notifications', id: 1 },
          ].map((tab) => (
        <button
          key={tab.id}
          className={`
          py-3 px-4 lg:px-8 text-sm lg:text-base 
          whitespace-nowrap
          rounded-t-lg font-medium transition-all duration-200
          ${activeTab === tab.id
          ? 'bg-white dark:bg-gray-800 text-brand dark:text-brand border-b-2 border-brand shadow-sm'
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
      {activeTab === 1 && <Notifications />}
      </div>
    </div>
  );
};

export default Settings;




