import React, { useState, useEffect, useRef } from 'react';

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
  useSameDetails: boolean;
  setUseSameDetails: (value: boolean) => void;
}

const countryCodes = [
  { value: '+234', label: '🇳🇬 +234' },
  { value: '+233', label: '🇬🇭 +233' },
  { value: '+27',  label: '🇿🇦 +27'  },
  { value: '+254', label: '🇰🇪 +254' },
  { value: '+255', label: '🇹🇿 +255' },
  { value: '+256', label: '🇺🇬 +256' },
  { value: '+260', label: '🇿🇲 +260' },
  { value: '+250', label: '🇷🇼 +250' },
  { value: '+221', label: '🇸🇳 +221' },
  { value: '+237', label: '🇨🇲 +237' },
  { value: '+225', label: '🇨🇮 +225' },
  { value: '+251', label: '🇪🇹 +251' },
  { value: '+20',  label: '🇪🇬 +20'  },
  { value: '+212', label: '🇲🇦 +212' },
  { value: '+44',  label: '🇬🇧 +44'  },
  { value: '+1',   label: '🇺🇸 +1'   },
  { value: '+33',  label: '🇫🇷 +33'  },
  { value: '+49',  label: '🇩🇪 +49'  },
  { value: '+971', label: '🇦🇪 +971' },
  { value: '+91',  label: '🇮🇳 +91'  },
  { value: '+61',  label: '🇦🇺 +61'  },
  { value: '+55',  label: '🇧🇷 +55'  },
];

const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none transition focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20 placeholder-gray-400 dark:placeholder-gray-500';

const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

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
  handleAdditionalTicketHolderChange,
  useSameDetails,
  setUseSameDetails,
}: TicketHolderProps) => {
  const [primaryEmailError, setPrimaryEmailError] = useState('');
  const [additionalEmailErrors, setAdditionalEmailErrors] = useState<Record<number, string>>({});
  const [countryCode, setCountryCode] = useState('+234');
  const [localPhone, setLocalPhone] = useState('');
  const isInternalChange = useRef(false);

  // Sync phoneNumber → split into code + local
  useEffect(() => {
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (!phoneNumber) { setCountryCode('+234'); setLocalPhone(''); return; }
    const matched = countryCodes.find(c => phoneNumber.startsWith(c.value));
    if (matched) {
      setCountryCode(matched.value);
      setLocalPhone(phoneNumber.slice(matched.value.length).trim());
    } else {
      setLocalPhone(phoneNumber);
    }
  }, [phoneNumber]);

  // Sync code + local → phoneNumber
  useEffect(() => {
    if (!localPhone.trim()) {
      if (phoneNumber) { isInternalChange.current = true; setPhoneNumber(''); }
      return;
    }
    const full = `${countryCode} ${localPhone.trim()}`;
    if (full !== phoneNumber) { isInternalChange.current = true; setPhoneNumber(full); }
  }, [countryCode, localPhone, phoneNumber, setPhoneNumber]);

  return (
    <div className="space-y-5">
      {/* Primary attendee card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Your Details
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Full Name */}
          <div>
            <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Ada Johnson"
              className={inputCls}
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setPrimaryEmailError(e.target.value && !validateEmail(e.target.value) ? 'Enter a valid email' : '');
              }}
              placeholder="you@example.com"
              className={`${inputCls} ${primaryEmailError ? 'border-red-500 focus:ring-red-200' : ''}`}
              autoComplete="email"
            />
            {primaryEmailError && (
              <p className="mt-1 text-xs text-red-500">{primaryEmailError}</p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Your ticket confirmation will be sent here.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-28 flex-shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#f54502] focus:ring-2 focus:ring-[#f54502]/20"
              >
                {countryCodes.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={localPhone}
                onChange={e => setLocalPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder="080 0000 0000"
                className={`${inputCls} flex-1`}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className={inputCls}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      {/* Additional ticket holders */}
      {quantity > 1 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Additional Tickets ({quantity - 1})
              </p>
            </div>

            {/* Toggle */}
            <div className="p-4">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setUseSameDetails(true)}
                  className={`flex-1 py-2.5 px-3 transition-colors text-center
                    ${useSameDetails
                      ? 'bg-[#f54502] text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  Use my details
                </button>
                <button
                  type="button"
                  onClick={() => setUseSameDetails(false)}
                  className={`flex-1 py-2.5 px-3 transition-colors text-center border-l border-gray-200 dark:border-gray-700
                    ${!useSameDetails
                      ? 'bg-[#f54502] text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  Individual details
                </button>
              </div>

              {useSameDetails ? (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Your details above will be used for all {quantity} tickets.
                </p>
              ) : (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Fill in separate details for each ticket holder below.
                </p>
              )}
            </div>
          </div>

          {/* Individual forms */}
          {!useSameDetails && Array.from({ length: quantity - 1 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Ticket Holder #{i + 2}
                </p>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={additionalTicketHolders[i]?.name || ''}
                    onChange={e => handleAdditionalTicketHolderChange(i, 'name', e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    placeholder="holder@example.com"
                    value={additionalTicketHolders[i]?.email || ''}
                    onChange={e => {
                      handleAdditionalTicketHolderChange(i, 'email', e.target.value);
                      setAdditionalEmailErrors(prev => ({
                        ...prev,
                        [i]: e.target.value && !validateEmail(e.target.value) ? 'Enter a valid email' : '',
                      }));
                    }}
                    className={`${inputCls} ${additionalEmailErrors[i] ? 'border-red-500 focus:ring-red-200' : ''}`}
                  />
                  {additionalEmailErrors[i] && (
                    <p className="mt-1 text-xs text-red-500">{additionalEmailErrors[i]}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                  <select
                    value={additionalTicketHolders[i]?.gender || ''}
                    onChange={e => handleAdditionalTicketHolderChange(i, 'gender', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
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
