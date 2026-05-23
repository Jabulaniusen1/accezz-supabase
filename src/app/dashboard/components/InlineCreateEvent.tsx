'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BiArrowBack } from '@/icon-adapters/react-icons/bi';
import Toast from '@/components/ui/Toast';
import AccountSetupPopup from '@/app/components/AccountSetupPopup';
import BasicInfo from '@/app/create-event/steps/BasicInfo';
import TicketSetup from '@/app/create-event/steps/TicketSetup';
import TicketDetails from '@/app/create-event/steps/TicketDetails';
import FinalDetails from '@/app/create-event/steps/FinalDetails';
import { saveFormProgress, getFormProgress } from '@/utils/localStorage';
import { Event, ToastProps } from '@/types/event';
import { supabase } from '@/utils/supabaseClient';

const INITIAL_EVENT_DATA: Event = {
  title: '',
  description: '',
  price: '',
  startTime: '',
  endTime: null,
  date: '',
  time: '',
  venue: '',
  location: '',
  address: '',
  city: '',
  country: '',
  latitude: null,
  longitude: null,
  categoryId: undefined,
  categoryName: undefined,
  categoryCustom: '',
  locationId: undefined,
  locationVisibility: 'public',
  hostName: '',
  image: null,
  gallery: [],
  isVirtual: false,
  virtualEventDetails: undefined,
  ticketType: [],
  socialMediaLinks: { twitter: '', facebook: '', instagram: '' },
  currency: 'NGN',
};

const combineDateAndTime = (date: string, time: string): string => {
  if (!date) return '';
  const combined = new Date(`${date}T${time || '00:00'}`);
  return Number.isNaN(combined.getTime()) ? '' : combined.toISOString();
};

const VISUAL_STEPS = ['Details', 'Ticket Setup', 'Ticket Details', 'Publish'] as const;

interface Props {
  onBack: () => void;
  userName: string;
}

export default function InlineCreateEvent({ onBack, userName }: Props) {
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [formData, setFormData] = useState<Event>(INITIAL_EVENT_DATA);
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const prevStep = useRef(step);
  const visualStep = step - 1; // 0-indexed, maps 1:1 to VISUAL_STEPS

  const hasValue = useCallback((value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    return String(value).trim().length > 0;
  }, []);

  const updateFormData = useCallback((data: Partial<Event>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    const savedData = getFormProgress();
    if (!savedData) return;
    try {
      const derivedStartTime = savedData.startTime || combineDateAndTime(savedData.date || '', savedData.time || '');
      setFormData(prev => ({
        ...prev,
        ...savedData,
        startTime: derivedStartTime || prev.startTime,
        endTime: savedData.endTime ?? prev.endTime ?? null,
        image: null,
        gallery: [],
      }));
    } catch (err) {
      console.error('Error loading saved progress:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => saveFormProgress({ ...formData, image: null, gallery: [] }), 300);
    return () => clearTimeout(timer);
  }, [formData]);

  const init = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_name, account_number, bank_code, bank_name, full_name, country')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const hasBankDetails =
        hasValue(profile?.account_number) &&
        (hasValue(profile?.bank_code) || hasValue(profile?.bank_name) || hasValue(profile?.account_name));

      setShowAccountSetup(!hasBankDetails);
      setFormData(prev => ({
        ...prev,
        hostName: prev.hostName || profile?.full_name || '',
        country: prev.country || profile?.country || '',
      }));
    } catch (err) {
      console.error('Error during init:', err);
    }
  }, [hasValue]);

  useEffect(() => {
    init();
  }, [init]);

  const validateStep = useCallback((s: number): boolean => {
    const checks: Record<number, () => boolean | string> = {
      1: () => {
        if (!formData.title.trim()) return 'Please enter an event title';
        if (!formData.description.trim()) return 'Please enter an event description';
        if (!formData.image) return 'Please upload an event image';
        if (!formData.startTime) return 'Please set event start date and time';
        if (new Date(formData.startTime).getTime() <= Date.now()) return 'Event start time must be in the future';
        if (!formData.categoryId && !formData.categoryCustom?.trim()) return 'Please choose an event category';
        if (formData.endTime) {
          const end = new Date(formData.endTime).getTime();
          if (Number.isNaN(end) || end <= new Date(formData.startTime).getTime()) return 'End time must be after start time';
        }
        if (formData.isVirtual) {
          if (!formData.virtualEventDetails?.platform) return 'Please select a virtual event platform';
        } else if ((formData.locationVisibility ?? 'public') !== 'undisclosed') {
          if (!(formData.venue ?? '').trim()) return 'Please enter a venue';
          if (!formData.country?.trim()) return 'Please select a country';
          if (!formData.city?.trim()) return 'Please enter a city';
          if (!formData.address?.trim()) return 'Please enter an event address';
        }
        return true;
      },
      2: () => {
        if (formData.ticketType.length === 0) return 'Please add at least one ticket type';
        for (const t of formData.ticketType) {
          if (!t.name.trim()) return 'Please enter a name for all ticket types';
          if (!t.price || parseFloat(t.price) < 0) return 'Please enter a valid price for all ticket types';
          if (!t.quantity || parseInt(t.quantity) <= 0) return 'Please enter a valid quantity for all ticket types';
        }
        return true;
      },
      3: () => true,
      4: () => true,
    };
    const result = checks[s]?.() ?? true;
    if (typeof result === 'string') {
      setToast({ type: 'error', message: result, onClose: () => setToast(null) });
      return false;
    }
    return true;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(step)) setStep(p => Math.min(p + 1, 4));
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    if (step === 1) onBack();
    else setStep(p => Math.max(p - 1, 1));
  }, [step, onBack]);

  useEffect(() => { prevStep.current = step; }, [step]);

  const commonProps = {
    formData,
    updateFormData,
    setToast: (t: ToastProps | null) => setToast(t),
    onBack: handleBack,
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Back */}
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
      >
        <BiArrowBack size={16} />
        Back
      </button>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {VISUAL_STEPS.map((label, i) => {
            const completed = i < visualStep;
            const active = i === visualStep;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      active || completed
                        ? 'bg-[#f54502] border-[#f54502] text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                    }`}
                  >
                    {completed ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`hidden sm:block mt-1.5 text-xs font-medium whitespace-nowrap ${
                      active || completed ? 'text-[#f54502]' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < VISUAL_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-3 mb-0 sm:mb-5 ${
                      i < visualStep ? 'bg-[#f54502]' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Mobile: current step name */}
        <p className="sm:hidden mt-3 text-center text-sm">
          <span className="font-semibold text-[#f54502]">{VISUAL_STEPS[visualStep]}</span>
          <span className="text-gray-400 dark:text-gray-500"> &middot; Step {visualStep + 1} of {VISUAL_STEPS.length}</span>
        </p>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hey {userName}!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Let&apos;s set up your event - it will only take a few minutes
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step > prevStep.current ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step > prevStep.current ? -40 : 40 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {step === 1 && <BasicInfo {...commonProps} onNext={handleNext} />}
            {step === 2 && <TicketSetup {...commonProps} onNext={handleNext} />}
            {step === 3 && <TicketDetails {...commonProps} onNext={handleNext} />}
            {step === 4 && <FinalDetails {...commonProps} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {showAccountSetup && (
        <AccountSetupPopup
          onClose={() => setShowAccountSetup(false)}
          onSetupComplete={() => {
            setShowAccountSetup(false);
            init();
          }}
        />
      )}
    </div>
  );
}
