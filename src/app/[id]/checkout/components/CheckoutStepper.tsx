import React from 'react';
import { Check } from '@/icon-adapters/lucide-react';
import { CHECKOUT_STEPS, type CheckoutStep } from './checkout';

interface CheckoutStepperProps {
  current: CheckoutStep;
  /** Completed steps can be revisited */
  onSelect: (step: CheckoutStep) => void;
  disabled?: boolean;
}

export default function CheckoutStepper({ current, onSelect, disabled }: CheckoutStepperProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Checkout progress">
      {CHECKOUT_STEPS.map((label, index) => {
        const step = index as CheckoutStep;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3 last:flex-none">
            <button
              type="button"
              onClick={() => onSelect(step)}
              disabled={disabled || !done}
              aria-current={active ? 'step' : undefined}
              className="group flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default"
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-brand text-white group-hover:bg-brand-dark'
                    : active
                      ? 'bg-brand text-white ring-4 ring-brand/15'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={`whitespace-nowrap text-sm font-medium ${
                  active ? 'text-gray-900 dark:text-white' : done ? 'text-gray-700 group-hover:text-brand dark:text-gray-300' : 'text-gray-400'
                } ${active ? '' : 'hidden sm:inline'}`}
              >
                {label}
              </span>
            </button>
            {index < CHECKOUT_STEPS.length - 1 && (
              <span className={`h-0.5 flex-1 rounded-full ${done ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
