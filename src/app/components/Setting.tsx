import React, { useState } from 'react';
import Profile from './settings/Profile';
import Password from './settings/Password';
import Notifications from './settings/Notification';
// import Payment from './settings/Payment';
import Account from './settings/Account';


const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className='flex flex-col px-0 sm:px-10 h-full w-full sm:max-w-full'>
      
      <h1 className='mb-6 text-lg lg:text-2xl font-bold text-gray-800 dark:text-gray-100 ml-0 sm:ml-2'>
      Settings
      </h1>

      {/* Improved Tab Navigation */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max border-b border-gray-200 dark:border-gray-700">
          {[
        { name: 'Profile', id: 0 },
        { name: 'Passwords', id: 1 },
        { name: 'Account', id: 2 },
        { name: 'Notifications', id: 3 },
          ].map((tab) => (
        <button
          key={tab.id}
          className={`
          py-2 px-3 lg:px-6 text-sm lg:text-base 
          whitespace-nowrap
          rounded-t-lg font-medium transition-all duration-200
          ${activeTab === tab.id
          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }
          ${activeTab === tab.id 
          ? 'shadow-sm' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
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
      <div className='mt-6 p-0 sm:p-6'>
      {activeTab === 0 && <Profile />}
      {activeTab === 1 && <Password />}
      {activeTab === 2 && <Account />}
      {activeTab === 3 && <Notifications />}
      </div>
    </div>
  );
};

export default Settings;




