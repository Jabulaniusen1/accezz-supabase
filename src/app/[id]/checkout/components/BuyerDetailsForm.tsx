import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from '@/icon-adapters/lucide-react';
import {
  EMPTY_HOLDER,
  GENDER_OPTIONS,
  type BuyerDetails,
  type FieldErrors,
  type TicketHolder,
} from './checkout';

const COUNTRY_CODES = [
  { value: '+234', label: '🇳🇬 +234' },
  { value: '+233', label: '🇬🇭 +233' },
  { value: '+27', label: '🇿🇦 +27' },
  { value: '+254', label: '🇰🇪 +254' },
  { value: '+255', label: '🇹🇿 +255' },
  { value: '+256', label: '🇺🇬 +256' },
  { value: '+260', label: '🇿🇲 +260' },
  { value: '+250', label: '🇷🇼 +250' },
  { value: '+221', label: '🇸🇳 +221' },
  { value: '+237', label: '🇨🇲 +237' },
  { value: '+225', label: '🇨🇮 +225' },
  { value: '+251', label: '🇪🇹 +251' },
  { value: '+20', label: '🇪🇬 +20' },
  { value: '+212', label: '🇲🇦 +212' },
  { value: '+44', label: '🇬🇧 +44' },
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+33', label: '🇫🇷 +33' },
  { value: '+49', label: '🇩🇪 +49' },
  { value: '+971', label: '🇦🇪 +971' },
  { value: '+91', label: '🇮🇳 +91' },
  { value: '+61', label: '🇦🇺 +61' },
  { value: '+55', label: '🇧🇷 +55' },
];

const fieldCls = (hasError: boolean) =>
  `rounded-xl border bg-white py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 dark:bg-gray-900 dark:text-white ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-gray-300 focus:border-brand focus:ring-brand/20 dark:border-gray-600'
  }`;
const inputCls = (hasError: boolean) => `w-full px-3.5 ${fieldCls(hasError)}`;

function Field({ id, label, error, hint, children }: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Native select with our own chevron, so the arrow sits inset from the edge */
function SelectBox({ hasError = false, className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      <select
        {...props}
        className={`w-full cursor-pointer appearance-none pl-3.5 pr-10 ${
          // Empty value reads as a placeholder
          props.value === '' ? fieldCls(hasError).replace('text-gray-900', 'text-gray-400').replace('dark:text-white', 'dark:text-gray-500') : fieldCls(hasError)
        }`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function GenderSelect({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <SelectBox
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      hasError={Boolean(error)}
    >
      <option value="" disabled>Select</option>
      {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value} className="text-gray-900">{g.label}</option>)}
    </SelectBox>
  );
}

interface BuyerDetailsFormProps {
  buyer: BuyerDetails;
  onBuyerChange: (field: keyof BuyerDetails, value: string) => void;
  quantity: number;
  useSameDetails: boolean;
  onUseSameDetailsChange: (value: boolean) => void;
  holders: TicketHolder[];
  onHolderChange: (index: number, field: keyof TicketHolder, value: string) => void;
  errors: FieldErrors;
  isLoggedIn: boolean;
  loginHref: string;
}

export default function BuyerDetailsForm({
  buyer,
  onBuyerChange,
  quantity,
  useSameDetails,
  onUseSameDetailsChange,
  holders,
  onHolderChange,
  errors,
  isLoggedIn,
  loginHref,
}: BuyerDetailsFormProps) {
  // Phone is stored as "+234 8012345678"; edited as country code + local number
  const [countryCode, setCountryCode] = useState('+234');
  const [localPhone, setLocalPhone] = useState('');
  const internalChange = useRef(false);

  useEffect(() => {
    if (internalChange.current) { internalChange.current = false; return; }
    if (!buyer.phone) { setLocalPhone(''); return; }
    const match = COUNTRY_CODES.find((c) => buyer.phone.startsWith(c.value));
    if (match) {
      setCountryCode(match.value);
      setLocalPhone(buyer.phone.slice(match.value.length).trim());
    } else {
      setLocalPhone(buyer.phone);
    }
  }, [buyer.phone]);

  const updatePhone = (code: string, local: string) => {
    setCountryCode(code);
    setLocalPhone(local);
    internalChange.current = true;
    onBuyerChange('phone', local.trim() ? `${code} ${local.trim()}` : '');
  };

  return (
    <div className="space-y-8">
      {!isLoggedIn && (
        <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          Have an account?{' '}
          <Link href={loginHref} className="font-semibold text-brand hover:text-brand-dark">Log in</Link>
          {' '}to fill this in faster and keep your tickets in one place.
        </p>
      )}

      <section>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Contact information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field id="fullName" label="Full name" error={errors.fullName}>
            <input
              id="fullName"
              type="text"
              value={buyer.fullName}
              onChange={(e) => onBuyerChange('fullName', e.target.value)}
              placeholder="e.g. Ada Johnson"
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              className={inputCls(Boolean(errors.fullName))}
            />
          </Field>
          <Field id="email" label="Email address" error={errors.email} hint="Your tickets will be sent here">
            <input
              id="email"
              type="email"
              value={buyer.email}
              onChange={(e) => onBuyerChange('email', e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={inputCls(Boolean(errors.email))}
            />
          </Field>
          <Field id="phone" label="Phone number" error={errors.phone}>
            <div className="flex gap-2">
              <SelectBox
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => updatePhone(e.target.value, localPhone)}
                className="w-32 flex-shrink-0"
              >
                {COUNTRY_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </SelectBox>
              <input
                id="phone"
                type="tel"
                value={localPhone}
                onChange={(e) => updatePhone(countryCode, e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder="801 234 5678"
                autoComplete="tel-national"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                className={`min-w-0 flex-1 px-3.5 ${fieldCls(Boolean(errors.phone))}`}
              />
            </div>
          </Field>
          <Field id="gender" label="Gender" error={errors.gender}>
            <GenderSelect id="gender" value={buyer.gender} onChange={(v) => onBuyerChange('gender', v)} error={errors.gender} />
          </Field>
        </div>
      </section>

      {quantity > 1 && (
        <section>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ticket holders</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You&apos;re buying {quantity} tickets. Who are they for?
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Ticket holders">
            {[
              { value: true, title: 'All in my name', text: `All ${quantity} tickets are sent to you` },
              { value: false, title: 'Add each person', text: 'Each ticket holder gets their own ticket by email' },
            ].map((option) => {
              const active = useSameDetails === option.value;
              return (
                <button
                  key={option.title}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onUseSameDetailsChange(option.value)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    active
                      ? 'border-brand bg-brand/[0.04] ring-1 ring-brand dark:bg-brand/10'
                      : 'border-gray-200 hover:border-brand/50 dark:border-gray-700'
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-brand' : 'border-gray-300 dark:border-gray-600'}`}>
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{option.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{option.text}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {!useSameDetails && (
            <div className="mt-6 space-y-6">
              {Array.from({ length: quantity - 1 }, (_, i) => {
                const holder = holders[i] || EMPTY_HOLDER;
                return (
                  <fieldset key={i} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700 sm:p-5">
                    <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-white">Ticket {i + 2}</legend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field id={`holder-${i}-name`} label="Full name" error={errors[`holder-${i}-name`]}>
                        <input
                          id={`holder-${i}-name`}
                          type="text"
                          value={holder.name}
                          onChange={(e) => onHolderChange(i, 'name', e.target.value)}
                          placeholder="Full name"
                          aria-invalid={Boolean(errors[`holder-${i}-name`])}
                          className={inputCls(Boolean(errors[`holder-${i}-name`]))}
                        />
                      </Field>
                      <Field id={`holder-${i}-email`} label="Email" error={errors[`holder-${i}-email`]}>
                        <input
                          id={`holder-${i}-email`}
                          type="email"
                          value={holder.email}
                          onChange={(e) => onHolderChange(i, 'email', e.target.value)}
                          placeholder="name@example.com"
                          aria-invalid={Boolean(errors[`holder-${i}-email`])}
                          className={inputCls(Boolean(errors[`holder-${i}-email`]))}
                        />
                      </Field>
                      <Field id={`holder-${i}-gender`} label="Gender" error={errors[`holder-${i}-gender`]}>
                        <GenderSelect
                          id={`holder-${i}-gender`}
                          value={holder.gender}
                          onChange={(v) => onHolderChange(i, 'gender', v)}
                          error={errors[`holder-${i}-gender`]}
                        />
                      </Field>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
