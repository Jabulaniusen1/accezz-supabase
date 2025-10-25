import React, { useState } from 'react';

interface TicketHolderProps {
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  quantity: number;
  additionalTicketHolders: Array<{ name: string; email: string }>;
  handleAdditionalTicketHolderChange: (index: number, field: string, value: string) => void;
}

const OrderInformationStep = ({ 
  fullName, 
  setFullName, 
  email, 
  setEmail, 
  phoneNumber, 
  setPhoneNumber, 
  quantity, 
  additionalTicketHolders, 
  handleAdditionalTicketHolderChange 
}: TicketHolderProps) => {
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});
  const [primaryEmailError, setPrimaryEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handlePrimaryEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    if (value && !validateEmail(value)) {
      setPrimaryEmailError('Please enter a valid email address');
    } else {
      setPrimaryEmailError('');
    }
  };

  const handleAdditionalEmailChange = (index: number, value: string) => {
    handleAdditionalTicketHolderChange(index, 'email', value);
    
    if (value && !validateEmail(value)) {
      setEmailErrors(prev => ({ ...prev, [index]: 'Please enter a valid email address' }));
    } else {
      setEmailErrors(prev => ({ ...prev, [index]: '' }));
    }
  };

  return (
    <div className="mb-4 space-y-8 overflow-y-scroll max-h-[60vh] pr-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      {/* Primary Ticket Holder */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center space-x-2 mb-4">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h2 className="text-gray-800 dark:text-white font-semibold">
            Primary Ticket Holder
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Full Name"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
              style={{ boxShadow: '0 2px 3px 2px rgba(19, 19, 19, 0.26))', borderRadius: '0.5rem' }}
            />
          </div>
          <div>
            <input
              type="email"
              value={email}
              onChange={handlePrimaryEmailChange}
              required
              placeholder="Email Address"
              className={`w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none ${
                primaryEmailError ? 'border-2 border-red-500' : ''
              }`}
              style={{ boxShadow: '0 2px 3px 2px rgba(19, 19, 19, 0.26))', borderRadius: '0.5rem' }}
            />
            {primaryEmailError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{primaryEmailError}</p>
            )}
          </div>
          <div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              placeholder="Phone Number"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
              style={{ boxShadow: '0 2px 3px 2px rgba(19, 19, 19, 0.26))', borderRadius: '0.5rem' }}
            />
          </div>
        </div>
      </div>

      {/* Additional Ticket Holders */}
      {quantity > 1 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-gray-800 dark:text-white font-semibold">
              Additional Ticket Holders
            </h2>
          </div>

          {Array.from({ length: quantity - 1 }, (_, index) => (
            <div
              key={index}
              className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md space-y-4 hover:shadow-lg transition-all duration-200"
            >
              <h3 className="text-gray-600 dark:text-gray-300 font-medium">
                Ticket Holder #{index + 2}
              </h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={`Full Name #${index + 2}`}
                  value={additionalTicketHolders[index]?.name || ''}
                  onChange={(e) =>
                    handleAdditionalTicketHolderChange(index, 'name', e.target.value)
                  }
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900/50 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
                />
                <div>
                  <input
                    type="email"
                    placeholder={`Email Address #${index + 2}`}
                    value={additionalTicketHolders[index]?.email || ''}
                    onChange={(e) =>
                      handleAdditionalEmailChange(index, e.target.value)
                    }
                    className={`w-full px-4 py-2 bg-white dark:bg-gray-900/50 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none ${
                      emailErrors[index] ? 'border-2 border-red-500' : ''
                    }`}
                  />
                  {emailErrors[index] && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailErrors[index]}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderInformationStep;