'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BiArrowBack } from 'react-icons/bi';

// Components
import { FormContainer } from './components/FormContainer';
import Toast from '@/components/ui/Toast';
import ToggleMode from '@/components/ui/mode/toggleMode';
import AccountSetupPopup from '@/app/components/AccountSetupPopup';

// Steps
import BasicInfo from './steps/BasicInfo';
import TicketSetup from './steps/TicketSetup';
import TicketDetails from './steps/TicketDetails';
import FinalDetails from './steps/FinalDetails';

// Utils & Types
import { saveFormProgress, getFormProgress } from '@/utils/localStorage';
import { Event, ToastProps } from '@/types/event';
import { supabase } from '@/utils/supabaseClient';

const INITIAL_EVENT_DATA: Event = {
  title: '',
  description: '',
  date: '',
  time: '',
  venue: '',
  location: '',
  hostName: '',
  image: null,
  gallery: [],
  isVirtual: false,
  virtualEventDetails: undefined,
  ticketType: [],
  socialMediaLinks: {
    twitter: '',
    facebook: '',
    instagram: ''
  },
  currency: 'NGN'
};

const STEPS = [
  { number: 1, title: 'Basic Information' },
  { number: 2, title: 'Ticket Setup' },
  { number: 3, title: 'Ticket Details' },
  { number: 4, title: 'Final Details' }
];

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [formData, setFormData] = useState<Event>(INITIAL_EVENT_DATA);
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const prevStep = useRef(step);

  // Memoized update function
  const updateFormData = useCallback((data: Partial<Event>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  // Load saved progress on mount
  useEffect(() => {
    const savedData = getFormProgress();
    if (savedData) {
      try {
        setFormData(prev => ({
          ...prev,
          ...savedData,
          image: null,
          gallery: []
        }));
        
        if (savedData.image) {
          setToast({ 
            type: 'info', 
            message: 'Please re-upload your event image',
            onClose: () => setToast(null)
          });
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save progress on updates - debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      const dataToSave = {
        ...formData,
        image: null,
        gallery: []
      };
      saveFormProgress(dataToSave);
    }, 300);

    return () => clearTimeout(timer);
  }, [formData]);

  // Check authentication and bank account status
  useEffect(() => {
    const checkAuthAndAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setToast({ 
            type: 'error', 
            message: 'Please login to create an event',
            onClose: () => setToast(null)
          });
          router.push('/auth/login');
          return;
        }

        // Check if user has bank account setup
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_number')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // If no profile exists or no account_number, show setup popup
        if (profileError || !profile?.account_number) {
          setShowAccountSetup(true);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setToast({ 
          type: 'error', 
          message: 'Failed to verify authentication',
          onClose: () => setToast(null)
        });
      }
    };

    checkAuthAndAccount();
  }, [router]);

  // Step validation
  const validateStep = useCallback((currentStep: number): boolean => {
    const validations: Record<number, () => boolean | string> = {
      1: () => {
        if (!formData.title.trim()) return 'Please enter an event title';
        if (!formData.description.trim()) return 'Please enter an event description';
        if (!formData.image) return 'Please upload an event image';
        if (!formData.date || !formData.time) return 'Please set event date and time';
        
        if (formData.isVirtual) {
          if (!formData.virtualEventDetails?.platform) return 'Please select a virtual event platform';
          if (formData.virtualEventDetails.platform === 'google-meet' && !formData.virtualEventDetails.meetingUrl) {
            return 'Please enter a Google Meet URL';
          }
          if (formData.virtualEventDetails.platform === 'meets' && !formData.virtualEventDetails.meetingUrl) {
            return 'Please enter a Meets URL';
          }
        } else {
          if (!formData.venue || !formData.location) return 'Please enter event venue and location';
        }
        return true;
      },
      2: () => {
        if (formData.ticketType.length === 0) return 'Please add at least one ticket type';
        
        for (const ticket of formData.ticketType) {
          if (!ticket.name.trim()) return 'Please enter a name for all ticket types';
          if (!ticket.price || parseFloat(ticket.price) < 0) return 'Please enter a valid price for all ticket types';
          if (!ticket.quantity || parseInt(ticket.quantity) <= 0) return 'Please enter a valid quantity for all ticket types';
        }
        return true;
      },
      3: () => true,
      4: () => true
    };

    const validationResult = validations[currentStep]?.() || true;
    if (typeof validationResult === 'string') {
      setToast({ type: 'error', message: validationResult, onClose: () => setToast(null) });
      return false;
    }
    return true;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, STEPS.length));
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  useEffect(() => {
    prevStep.current = step;
  }, [step]);

  const renderStepContent = useCallback(() => {
    const commonProps = {
      formData,
      updateFormData,
      setToast: (toast: ToastProps | null) => setToast(toast),
      onBack: handleBack
    };

    switch (step) {
      case 1: return <BasicInfo {...commonProps} onNext={handleNext} />;
      case 2: return <TicketSetup {...commonProps} onNext={handleNext} />;
      case 3: return <TicketDetails {...commonProps} onNext={handleNext} />;
      case 4: return <FinalDetails {...commonProps} />;
      default: return null;
    }
  }, [step, formData, updateFormData, handleBack, handleNext]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="fixed top-0 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm z-50 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-[#f54502] dark:hover:text-[#f54502] transition-colors duration-200 p-2 rounded-[5px] hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <BiArrowBack className="text-lg" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Create New Event
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <ToggleMode />
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#f54502] to-[#d63a02] -translate-y-1/2 z-10 transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
              
              {STEPS.map((stepItem) => (
                <div key={stepItem.number} className="relative z-20">
                  <button
                    onClick={() => step >= stepItem.number && setStep(stepItem.number)}
                    className={`flex flex-col items-center group ${step >= stepItem.number ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-[5px] flex items-center justify-center transition-all duration-300 text-sm sm:text-base
                      ${step === stepItem.number 
                        ? 'bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white shadow-lg ring-4 ring-[#f54502]/20 dark:ring-[#f54502]/20 transform scale-110'
                        : step > stepItem.number
                        ? 'bg-[#f54502] text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-400 border-2 border-gray-300 dark:border-gray-600'}`}
                    >
                      {step > stepItem.number ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepItem.number
                      )}
                    </div>
                    <span className={`mt-2 text-xs sm:text-sm font-medium text-center max-w-[100px] ${step >= stepItem.number ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {stepItem.title}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <FormContainer>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: step > prevStep.current ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: step > prevStep.current ? -50 : 50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </FormContainer>
        </div>
      </main>

      {showAccountSetup && (
        <AccountSetupPopup onClose={() => setShowAccountSetup(false)} />
      )}
    </div>
  );
}