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
    <div className="space-y-6 pr-1 sm:pr-2">
      <div className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f54502]/15 text-[#f54502] dark:bg-[#f54502]/20">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Primary Details
            </p>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Ticket Purchaser
            </h2>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Full Name
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter full name"
              className="w-full rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Email Address
            </span>
            <input
              type="email"
              value={email}
              onChange={handlePrimaryEmailChange}
              required
              placeholder="name@example.com"
              className={`w-full rounded-[5px] border bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white ${
                primaryEmailError ? 'border-red-500 focus:ring-red-100 dark:border-red-500' : 'border-gray-300'
              }`}
            />
            {primaryEmailError && (
              <p className="text-sm text-red-600 dark:text-red-400">{primaryEmailError}</p>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Phone Number
            </span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              placeholder="+234 000 0000 000"
              className="w-full rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
        </div>
      </div>

      {quantity > 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Additional Guests
              </p>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                Ticket Holders
              </h2>
            </div>
          </div>

          {Array.from({ length: quantity - 1 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900/60"
            >
              <h3 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                Ticket Holder #{index + 2}
              </h3>

              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={additionalTicketHolders[index]?.name || ''}
                    onChange={(e) =>
                      handleAdditionalTicketHolderChange(index, 'name', e.target.value)
                    }
                    className="w-full rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email Address</span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={additionalTicketHolders[index]?.email || ''}
                    onChange={(e) => handleAdditionalEmailChange(index, e.target.value)}
                    className={`w-full rounded-[5px] border bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white ${
                      emailErrors[index] ? 'border-red-500 focus:ring-red-100 dark:border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {emailErrors[index] && (
                    <p className="text-sm text-red-600 dark:text-red-400">{emailErrors[index]}</p>
                  )}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderInformationStep;