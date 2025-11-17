import React, { useState, useEffect, useRef } from 'react';
// Removed searchable select for country code per requirement

interface TicketHolderProps {
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  quantity: number;
  additionalTicketHolders: Array<{ name: string; email: string; phone?: string; gender?: string }>;
  handleAdditionalTicketHolderChange: (index: number, field: string, value: string) => void;
}

// Country codes list with common African countries first, then international
const countryCodes = [
  { value: '+234', label: '🇳🇬 +234 ' },
  { value: '+233', label: '🇬🇭 +233 ' },
  { value: '+27', label: '🇿🇦 +27 ' },
  { value: '+254', label: '🇰🇪 +254 ' },
  { value: '+255', label: '🇹🇿 +255 ' },
  { value: '+256', label: '🇺🇬 +256 ' },
  { value: '+260', label: '🇿🇲 +260 ' },
  { value: '+250', label: '🇷🇼 +250 ' },
  { value: '+221', label: '🇸🇳 +221 ' },
  { value: '+237', label: '🇨🇲 +237 ' },
  { value: '+225', label: '🇨🇮 +225 ' },
  { value: '+251', label: '🇪🇹 +251 ' },
  { value: '+20', label: '🇪🇬 +20 ' },
  { value: '+212', label: '🇲🇦 +212 ' },
  { value: '+213', label: '🇩🇿 +213 ' },
  { value: '+216', label: '🇹🇳 +216 ' },
  { value: '+244', label: '🇦🇴 +244 ' },
  { value: '+258', label: '🇲🇿 +258 ' },
  { value: '+267', label: '🇧🇼 +267 ' },
  { value: '+263', label: '🇿🇼 +263 ' },
  { value: '+44', label: '🇬🇧 +44 ' },
  { value: '+1', label: '🇺🇸 +1 ' },
  { value: '+33', label: '🇫🇷 +33 ' },
  { value: '+49', label: '🇩🇪 +49 ' },
  { value: '+39', label: '🇮🇹 +39 ' },
  { value: '+34', label: '🇪🇸 +34 ' },
  { value: '+31', label: '🇳🇱 +31 ' },
  { value: '+32', label: '🇧🇪 +32 ' },
  { value: '+41', label: '🇨🇭 +41 ' },
  { value: '+971', label: '🇦🇪 +971 ' },
  { value: '+966', label: '🇸🇦 +966 ' },
  { value: '+91', label: '🇮🇳 +91 ' },
  { value: '+86', label: '🇨🇳 +86 ' },
  { value: '+81', label: '🇯🇵 +81 ' },
  { value: '+82', label: '🇰🇷 +82 ' },
  { value: '+61', label: '🇦🇺 +61 ' },
  { value: '+64', label: '🇳🇿 +64 ' },
  { value: '+55', label: '🇧🇷 +55 ' },
  { value: '+52', label: '🇲🇽 +52 ' },
];

const OrderInformationStep = ({ 
  fullName, 
  setFullName, 
  email, 
  setEmail, 
  phoneNumber, 
  setPhoneNumber,
  gender,
  setGender,
  quantity, 
  additionalTicketHolders, 
  handleAdditionalTicketHolderChange 
}: TicketHolderProps) => {
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});
  const [primaryEmailError, setPrimaryEmailError] = useState('');
  const [countryCode, setCountryCode] = useState('+234'); // Default to Nigeria
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const isInternalChange = useRef(false);

  // Extract country code and local number from phoneNumber when component mounts or phoneNumber changes externally
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (phoneNumber) {
      // Check if phoneNumber already starts with a country code
      const matchedCode = countryCodes.find(code => 
        phoneNumber.startsWith(code.value)
      );
      
      if (matchedCode) {
        const localNum = phoneNumber.replace(matchedCode.value, '').trim();
        setCountryCode(matchedCode.value);
        setLocalPhoneNumber(localNum);
      } else if (phoneNumber.startsWith('+')) {
        // Has a country code but not in our list, extract it
        const match = phoneNumber.match(/^(\+\d{1,4})\s*(.*)$/);
        if (match) {
          setCountryCode(match[1]);
          setLocalPhoneNumber(match[2].trim());
        } else {
          // Just set as local number if it doesn't match pattern
          setLocalPhoneNumber(phoneNumber);
        }
      } else {
        // No country code, assume it's just the local number
        setLocalPhoneNumber(phoneNumber);
      }
    } else {
      // Reset to default if phoneNumber is empty
      setCountryCode('+234');
      setLocalPhoneNumber('');
    }
  }, [phoneNumber]);

  // Update phoneNumber when country code or local number changes
  useEffect(() => {
    // Only update if there's a local phone number, or if we're changing the country code
    if (localPhoneNumber.trim()) {
      const fullPhone = `${countryCode} ${localPhoneNumber.trim()}`.trim();
      if (fullPhone !== phoneNumber) {
        isInternalChange.current = true;
        setPhoneNumber(fullPhone);
      }
    } else if (phoneNumber && !localPhoneNumber.trim()) {
      // If phoneNumber exists but localPhoneNumber is empty, clear it
      const currentCode = countryCodes.find(code => phoneNumber.startsWith(code.value));
      if (!currentCode || currentCode.value !== countryCode) {
        // Country code changed but no local number, clear phoneNumber
        isInternalChange.current = true;
        setPhoneNumber('');
      }
    }
  }, [countryCode, localPhoneNumber, phoneNumber, setPhoneNumber]);

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
    <div className="space-y-6 w-full min-w-0">
      <div className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 w-full min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f54502]/15 text-[#f54502] dark:bg-[#f54502]/20 flex-shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Primary Details
            </p>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Ticket Purchaser
            </h2>
          </div>
        </div>

        <div className="grid gap-4 w-full min-w-0">
          <label className="grid gap-2 w-full min-w-0">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Full Name
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Enter full name"
              className="w-full min-w-0 rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="grid gap-2 w-full min-w-0">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Email Address
            </span>
            <input
              type="email"
              value={email}
              onChange={handlePrimaryEmailChange}
              required
              placeholder="name@example.com"
              className={`w-full min-w-0 rounded-[5px] border bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white ${
                primaryEmailError ? 'border-red-500 focus:ring-red-100 dark:border-red-500' : 'border-gray-300'
              }`}
            />
            {primaryEmailError && (
              <p className="text-sm text-red-600 dark:text-red-400">{primaryEmailError}</p>
            )}
          </label>

          <label className="grid gap-2 w-full min-w-0">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Phone Number
            </span>
            <div className="flex gap-2 w-full min-w-0">
              <div className="w-24 sm:w-28 flex-shrink-0 min-w-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full h-[42px] rounded-[5px] border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {countryCodes.map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="tel"
                value={localPhoneNumber}
                onChange={(e) => {
                  // Allow only digits, spaces, and hyphens
                  const value = e.target.value.replace(/[^\d\s-]/g, '');
                  setLocalPhoneNumber(value);
                }}
                required
                placeholder="000 0000 000"
                className="flex-1 min-w-0 rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </label>

          <label className="grid gap-2 w-full min-w-0">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Gender
            </span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              className="w-full min-w-0 rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>
        </div>
      </div>

      {quantity > 1 && (
        <div className="space-y-4 w-full min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </span>
            <div className="min-w-0">
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
              className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900/60 w-full min-w-0"
            >
              <h3 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                Ticket Holder #{index + 2}
              </h3>

              <div className="grid gap-4 w-full min-w-0">
                <label className="grid gap-2 w-full min-w-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={additionalTicketHolders[index]?.name || ''}
                    onChange={(e) =>
                      handleAdditionalTicketHolderChange(index, 'name', e.target.value)
                    }
                    className="w-full min-w-0 rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>

                <label className="grid gap-2 w-full min-w-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email Address</span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={additionalTicketHolders[index]?.email || ''}
                    onChange={(e) => handleAdditionalEmailChange(index, e.target.value)}
                    className={`w-full min-w-0 rounded-[5px] border bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white ${
                      emailErrors[index] ? 'border-red-500 focus:ring-red-100 dark:border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {emailErrors[index] && (
                    <p className="text-sm text-red-600 dark:text-red-400">{emailErrors[index]}</p>
                  )}
                </label>

                <label className="grid gap-2 w-full min-w-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Gender</span>
                  <select
                    value={additionalTicketHolders[index]?.gender || ''}
                    onChange={(e) => handleAdditionalTicketHolderChange(index, 'gender', e.target.value)}
                    required
                    className="w-full min-w-0 rounded-[5px] border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
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