import React, { useEffect, useMemo, useState, useRef } from 'react';
import Receipt from './Receipt';
import TicketSelectionStep from './TicketFormSec/TicketSelectionStep';
import OrderInformationStep from './TicketFormSec/OrderInformationStep';
import PaymentStep from './TicketFormSec/PaymentStep';
import CreateAccountPrompt from './CreateAccountPrompt';
import { fetchEventBySlug } from '@/utils/eventUtils';
import { createOrder, createFreeTickets } from '@/utils/paymentUtils';
import { saveTicketPurchaseState, getTicketPurchaseState, clearTicketPurchaseState } from '@/utils/localStorage';
import { supabase } from '@/utils/supabaseClient';
import { getSession } from '@/utils/supabaseAuth';
import { useTicketPurchase } from '@/contexts/TicketPurchaseContext';

type TicketOption = {
  id: string;
  name: string;
  price: string;
  quantity: string;
  sold: string;
  details?: string; // Made optional
  attendees?: { name: string; email: string }[];
};

type TicketTypeFormProps = {
  closeForm: () => void;
  tickets: TicketOption[];
  eventSlug: string;
  setToast: (toast: { type: 'success' | 'error'; message: string } | null) => void;
  isOpen?: boolean;
  initialTicket?: TicketOption;
};

interface Event { id: string; slug: string; }

const parsePriceValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const TicketTypeForm = ({ closeForm, tickets, eventSlug, setToast, isOpen = true, initialTicket }: TicketTypeFormProps) => {
  const { setIsPurchasing } = useTicketPurchase();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<TicketOption | null>(initialTicket ?? null);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [events, setEvent] = useState<Event | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [additionalTicketHolders, setAdditionalTicketHolders] = useState<Array<{
    name: string;
    email: string;
    phone?: string;
    gender?: string;
  }>>([]);

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [hasLoadedUserInfo, setHasLoadedUserInfo] = useState(false);
  const fieldsRef = useRef({ fullName, email, phoneNumber });

  const eventId = events?.id;

  const totalPrice = useMemo(() => {
    return parsePriceValue(selectedTicket?.price) * quantity;
  }, [selectedTicket, quantity]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventSlug || typeof eventSlug !== 'string') {
        console.error('Invalid eventSlug:', eventSlug);
        return;
      }

      try {
        console.log('Fetching event for slug:', eventSlug);
        const fetchedEvent = await fetchEventBySlug(eventSlug);
        if (fetchedEvent) {
          console.log('Event fetched successfully:', fetchedEvent.id);
          setEvent({ id: fetchedEvent.id || '', slug: fetchedEvent.slug || '' });
        } else {
          console.error('No event found for slug:', eventSlug);
          setToast({ type: 'error', message: 'Event not found' });
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setToast({ type: 'error', message: 'Failed to load event details' });
      } 
    };

    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  useEffect(() => {
    setIsSheetVisible(true);
  }, []);

  // Restore saved state on mount
  useEffect(() => {
    try {
      const savedState = getTicketPurchaseState();
      if (savedState && savedState.eventSlug === eventSlug && savedState.showTicketForm) {
        if (savedState.activeStep !== undefined) setActiveStep(savedState.activeStep);
        if (savedState.selectedTicket) setSelectedTicket(savedState.selectedTicket);
        if (savedState.quantity !== undefined) setQuantity(savedState.quantity);
          if (savedState.fullName) setFullName(savedState.fullName);
          if (savedState.email) setEmail(savedState.email);
          if (savedState.phoneNumber) setPhoneNumber(savedState.phoneNumber);
          if (savedState.gender) setGender(savedState.gender);
          if (savedState.orderId) setOrderId(savedState.orderId);
          if (savedState.additionalTicketHolders) setAdditionalTicketHolders(savedState.additionalTicketHolders);
      }
    } catch (error) {
      console.error('Error restoring ticket purchase state:', error);
    }
  }, [eventSlug]);

  // Update ref whenever fields change
  useEffect(() => {
    fieldsRef.current = { fullName, email, phoneNumber };
  }, [fullName, email, phoneNumber]);

  // Helper function to pre-fill user information
  const preFillUserInfo = async () => {
    if (hasLoadedUserInfo) {
      return;
    }

    try {
      // Check if there's saved state with actual user input - if so, don't pre-fill
      const savedState = getTicketPurchaseState();
      const hasSavedUserInput = savedState && 
                                savedState.eventSlug === eventSlug && 
                                savedState.showTicketForm &&
                                savedState.fullName?.trim() && 
                                savedState.email?.trim() && 
                                savedState.phoneNumber?.trim();
      
      if (hasSavedUserInput) {
        // Saved state has user input, don't pre-fill
        console.log('Skipping pre-fill: saved state has user input', savedState);
        setHasLoadedUserInfo(true);
        return;
      }

      const session = await getSession();
      if (!session) {
        console.log('Skipping pre-fill: no session');
        setHasLoadedUserInfo(true);
        return;
      }

      // Check current field values using ref to get latest values
      const currentFullName = fieldsRef.current.fullName.trim();
      const currentEmail = fieldsRef.current.email.trim();
      const currentPhone = fieldsRef.current.phoneNumber.trim();

      if (currentFullName || currentEmail || currentPhone) {
        // Fields already have values, don't pre-fill
        console.log('Skipping pre-fill: fields already have values', { currentFullName, currentEmail, currentPhone });
        setHasLoadedUserInfo(true);
        return;
      }

      console.log('Pre-filling user info from database...');
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Pre-fill from profile or user metadata
      const userFullName = profile?.full_name || 
                          session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.fullName || 
                          '';
      const userEmail = session.user.email || '';
      const userPhone = profile?.phone || 
                       session.user.user_metadata?.phone || 
                       '';

      console.log('User info to pre-fill:', { userFullName, userEmail, userPhone });

      // Pre-fill the fields
      if (userFullName && !currentFullName) {
        setFullName(userFullName);
        console.log('Pre-filled full name:', userFullName);
      }
      if (userEmail && !currentEmail) {
        setEmail(userEmail);
        console.log('Pre-filled email:', userEmail);
      }
      if (userPhone && !currentPhone) {
        setPhoneNumber(userPhone);
        console.log('Pre-filled phone:', userPhone);
      }
      
      setHasLoadedUserInfo(true);
    } catch (error) {
      console.error('Error loading user info:', error);
      setHasLoadedUserInfo(true);
      // Silently fail - user can still fill manually
    }
  };

  // Update ticket purchase context when form opens/closes
  useEffect(() => {
    setIsPurchasing(isOpen);
    
    // Cleanup: reset when component unmounts
    return () => {
      setIsPurchasing(false);
    };
  }, [isOpen, setIsPurchasing]);

  // Pre-fill user information when form opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Wait a bit to ensure saved state restoration happens first
    const timer = setTimeout(() => {
      preFillUserInfo();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventSlug]);

  // Pre-fill user information when user reaches step 1 (order information step)
  useEffect(() => {
    if (!isOpen || activeStep !== 1 || hasLoadedUserInfo) {
      return;
    }

    // Small delay to ensure form is rendered
    const timer = setTimeout(() => {
      preFillUserInfo();
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, isOpen]);

  // Reset hasLoadedUserInfo when form closes
  useEffect(() => {
    if (!isOpen) {
      setHasLoadedUserInfo(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!initialTicket) return;

    setSelectedTicket(prev => {
      if (prev && prev.name === initialTicket.name && prev.price === initialTicket.price) {
        return prev;
      }
      return { ...initialTicket };
    });
    setActiveStep(0);
    setQuantity(1);
    setAdditionalTicketHolders([]);
  }, [initialTicket]);

  // Save state whenever it changes (only when modal is open)
  useEffect(() => {
    if (!isOpen) return;
    try {
      saveTicketPurchaseState({
        eventSlug,
        showTicketForm: true,
        activeStep,
        selectedTicket: selectedTicket || undefined,
        quantity,
        fullName,
        email,
        phoneNumber,
        gender,
        totalPrice,
        orderId: orderId || undefined,
        additionalTicketHolders: additionalTicketHolders.length > 0 ? additionalTicketHolders : undefined,
      });
    } catch (error) {
      console.error('Error saving ticket purchase state:', error);
    }
  }, [activeStep, selectedTicket, quantity, fullName, email, phoneNumber, gender, totalPrice, orderId, additionalTicketHolders, eventSlug, isOpen]);

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!selectedTicket) {
        setToast({ type: 'error', message: 'Please select a ticket' });
        return;
      }
      setActiveStep(1);

    } else if (activeStep === 1) {
      if (!fullName || !phoneNumber || !email || !gender) {
        setToast({ type: 'error', message: 'All fields are required.' });
        return;
      }

        const allAttendees = [
          { name: fullName, email: email, gender: gender || undefined }
        ];

        if (additionalTicketHolders.length > 0) {
          allAttendees.push(...additionalTicketHolders.map(holder => ({
            name: holder.name,
            email: holder.email,
            gender: holder.gender || undefined
          })));
        }

      if (!eventId || !selectedTicket) {
        setToast({ type: 'error', message: 'Missing event or ticket information' });
        return;
      }

      // Handle free tickets
      if (Number(selectedTicket.price.replace(/[^\d.-]/g, '')) === 0) {
        setActiveStep(2);
        return;
      }

      // Create order for paid tickets
      try {
        setIsLoading(true);
        console.log('Creating order with params:', {
          eventId,
          ticketTypeName: selectedTicket.name,
          quantity: allAttendees.length,
          email,
          phone: phoneNumber,
          fullName
        });
        
        const { orderId: createdOrderId } = await createOrder({
          eventId: eventId,
          ticketTypeName: selectedTicket.name,
          quantity: allAttendees.length,
          email: email,
          phone: phoneNumber,
          fullName: fullName,
          gender: gender,
          attendees: allAttendees.length > 1 ? allAttendees.slice(1) : null,
          currency: 'NGN',
        });

        console.log('Order created successfully:', createdOrderId);
        setOrderId(createdOrderId);
        
        // Store order info for payment processing
        try {
          localStorage.setItem('pendingPayment', JSON.stringify({
            orderId: createdOrderId,
            eventId: eventId,
            eventSlug: eventSlug,  // Store event slug for proper redirect on cancel
            email,
            amount: totalPrice,
            currency: 'NGN'
          }));
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
          // Non-critical - we have orderId in state
        }

        setToast({
          type: 'success',
          message: 'Order created. Proceed to payment.'
        });
        setActiveStep(2);
      } catch (error: unknown) {
        console.error('Error creating order:', error);
        const errorMessage = (error as Error).message || 'Unknown error occurred';
        console.error('Full error details:', JSON.stringify(error, null, 2));
        setToast({
          type: 'error',
          message: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePurchase = async () => {
    // Set loading state immediately when button is clicked
    setIsLoading(true);
    
    if (!eventId || !selectedTicket) {
      setIsLoading(false);
      setToast({ type: 'error', message: 'Missing information' });
      return;
    }

    const allAttendees = [
      { name: fullName, email: email, gender: gender || undefined }
    ];

    if (additionalTicketHolders.length > 0) {
      allAttendees.push(...additionalTicketHolders.map(holder => ({
        name: holder.name,
        email: holder.email,
        gender: holder.gender || undefined
      })));
    }

    const attendees = allAttendees.length > 1 ? allAttendees.slice(1) : null;
    const ticketPrice = Number(selectedTicket.price.replace(/[^\d.-]/g, ''));

    try {

      // Handle free tickets
      if (ticketPrice === 0) {
        try {
          const { ticketId, orderId: createdOrderId } = await createFreeTickets({
            eventId: eventId,
            ticketTypeName: selectedTicket.name,
            quantity: quantity,
            email: email,
            phone: phoneNumber,
            fullName: fullName,
            gender: gender,
            attendees: attendees,
            currency: 'NGN',
          });

          clearTicketPurchaseState();
          
          // Check if user is logged in
          const session = await getSession();
          
          // If user is not logged in, show account creation prompt
          if (!session) {
            setPurchaseOrderId(createdOrderId);
            setShowAccountPrompt(true);
            setIsLoading(false);
            // Don't redirect yet - wait for user to close the prompt
            return;
          }
          
          // User is logged in, redirect to invoice page
          // Keep loading state during redirect so spinner stays visible
          window.location.href = `/invoice/${createdOrderId}`;
          return;
        } catch (error: unknown) {
          console.error('Error creating free ticket:', error);
          setIsLoading(false);
          setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Error creating free ticket') });
          return;
        }
      }

      // For paid tickets, use Paystack popup
      if (!orderId) {
        setIsLoading(false);
        setToast({ type: 'error', message: 'Order information not found. Please try again.' });
        return;
      }
      
      // Initialize Paystack payment popup
      try {
        const res = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId, 
            amount: totalPrice, 
            email, 
            currency: 'NGN',
            callbackUrl: `${window.location.origin}/success?orderId=${orderId}`
          })
        });

        const data = await res.json() as { authorization_url?: string; access_code?: string; reference?: string; error?: string };
        
        if (!res.ok || !data?.authorization_url) {
          throw new Error(data?.error || 'Failed to initialize payment');
        }

        // Load Paystack inline JS SDK dynamically
        const loadPaystackScript = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            // Check if script already loaded
            if (window.PaystackPop) {
              resolve();
              return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v1/inline.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Paystack script'));
            document.head.appendChild(script);
          });
        };

        await loadPaystackScript();

        // Get public key from environment
        const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error('Paystack public key not configured');
        }

        if (!window.PaystackPop) {
          throw new Error('Paystack SDK not loaded');
        }

        // Initialize Paystack popup
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: email,
          amount: Math.round(totalPrice * 100), // Convert to kobo
          currency: 'NGN',
          ref: data.reference,
          callback: (response: { reference: string; status: string }) => {
            // Payment successful, verify and redirect to invoice
            // Note: callback must be synchronous, so we handle async operations inside
            (async () => {
              try {
                const verifyRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(response.reference)}`);
                const verifyData = await verifyRes.json() as { status?: string; orderId?: string; error?: string };
                
                if (verifyRes.ok && verifyData.status === 'success' && verifyData.orderId) {
                  // Mark order as paid and create tickets
                  const { markOrderAsPaid, createTicketsForOrder } = await import('@/utils/paymentUtils');
                  await markOrderAsPaid(verifyData.orderId, response.reference, 'paystack');
                  await createTicketsForOrder(verifyData.orderId);
                  
                  // Clear purchase state
                  clearTicketPurchaseState();
                  try { localStorage.removeItem('pendingPayment'); } catch {}
                  
                  // Redirect to invoice page
                  window.location.href = `/invoice/${verifyData.orderId}`;
                } else {
                  throw new Error(verifyData.error || 'Payment verification failed');
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                setIsLoading(false);
                setToast({ type: 'error', message: 'Payment verification failed. Please contact support.' });
              }
            })();
          },
          onClose: () => {
            // User closed the popup
            setIsLoading(false);
            setToast({ type: 'error', message: 'Payment cancelled' });
          }
        });

        handler.openIframe();
      } catch (error: unknown) {
        console.error('Error initializing payment:', error);
        setIsLoading(false);
        setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Failed to initialize payment') });
      }
      
    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      setIsLoading(false);
      setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Error processing payment') });
    }
    // Note: Don't reset loading in finally block if redirecting - let it stay visible during redirect
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleTicketSelection = (ticket: typeof tickets[0]) => {
    setSelectedTicket({
      id: ticket.id,
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.quantity,
      sold: ticket.sold,
      details: ticket.details || ''
    });
    setQuantity(1);
  }; 

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    
    setAdditionalTicketHolders(prev => {
      if (newQuantity <= 1) return [];
      if (newQuantity - 1 > prev.length) {
        return [...prev, ...Array(newQuantity - 1 - prev.length).fill({ name: '', email: '', phone: '', gender: '' })];
      }
      return prev.slice(0, newQuantity - 1);
    });
  };

  const handleAdditionalTicketHolderChange = (index: number, field: string, value: string) => {
    setAdditionalTicketHolders(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { name: '', email: '', };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const closeReceipt = () => {
    setIsPurchased(false);
    clearTicketPurchaseState();
    closeForm();
  };

  const handleAccountPromptClose = () => {
    setShowAccountPrompt(false);
    // After closing the prompt, get the ticketId from the order and redirect
    if (purchaseOrderId) {
      supabase
        .from('tickets')
        .select('id')
        .eq('order_id', purchaseOrderId)
        .limit(1)
        .single()
        .then(({ data: ticket, error }) => {
          if (!error && ticket) {
            window.location.href = `/success?ticketId=${ticket.id}`;
          } else {
            // Fallback: redirect to success page without ticketId
            window.location.href = '/success';
          }
        });
    }
  };

  const handleCloseForm = () => {
    clearTicketPurchaseState();
    closeForm();
  };

  return (
    <>
      {showAccountPrompt && purchaseOrderId && email && (
        <CreateAccountPrompt
          isOpen={showAccountPrompt}
          onClose={handleAccountPromptClose}
          buyerEmail={email}
          orderId={purchaseOrderId}
        />
      )}
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-gray-900/80 backdrop-blur-sm transition-colors duration-300 dark:text-white">
        <div
          className={`relative w-full max-w-3xl mx-auto h-[85vh] max-h-[90vh] sm:h-[70vh] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            isSheetVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
        <div className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-gray-300 dark:bg-gray-600" />
        <button
          onClick={handleCloseForm}
          aria-label="Close ticket purchase"
          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto pt-12 pb-6 px-4 sm:px-6">
          {isPurchased ? (
            <div className="h-full">
              <Receipt closeReceipt={closeReceipt} />
            </div>
          ) : (
            <div className="flex h-full flex-col space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-900 dark:text-white">
                Purchase Ticket
              </h2>

              {/* Custom Stepper */}
              {/* <div className="flex justify-center">
                <div className="flex items-center space-x-4 justify-between">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-1">
                      <div
                        className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 text-sm ${
                          index <= activeStep
                            ? 'bg-[#f54502] border-[#f54502] text-white'
                            : 'border-gray-300 text-gray-500'
                        }`}
                      >
                        {index < activeStep ? (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs sm:text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <span
                        className={`lg:ml-2 text-xs sm:text-sm font-medium ${
                          index <= activeStep ? 'text-[#f54502]' : 'text-gray-500'
                        }`}
                      >
                        {step}
                      </span>
                      {index < steps.length - 1 && (
                        <div
                          className={`hidden sm:block w-12 h-0.5 mx-2 ${
                            index < activeStep ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div> */}

              <form onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-col space-y-6">
                <div className="flex-1 space-y-6 pr-1">
                  {activeStep === 0 && (
                    <TicketSelectionStep
                      tickets={tickets}
                      selectedTicket={selectedTicket}
                      handleTicketSelection={handleTicketSelection}
                      quantity={quantity}
                      handleQuantityChange={handleQuantityChange}
                      totalPrice={totalPrice}
                    />
                  )}

                     {activeStep === 1 && (
                       <OrderInformationStep
                         fullName={fullName}
                         setFullName={setFullName}
                         email={email}
                         setEmail={setEmail}
                         phoneNumber={phoneNumber}
                         setPhoneNumber={setPhoneNumber}
                         gender={gender}
                         setGender={setGender}
                         quantity={quantity}
                         additionalTicketHolders={additionalTicketHolders}
                         handleAdditionalTicketHolderChange={handleAdditionalTicketHolderChange}
                       />
                     )}

                  {activeStep === 2 && (
                    <PaymentStep
                      selectedTicket={selectedTicket}
                      quantity={quantity}
                      totalPrice={totalPrice}
                      handlePurchase={handlePurchase}
                      isLoading={isLoading}
                    />
                  )}
                </div>

                <div className="sticky bottom-0 bg-white/50 backdrop-blur-md flex justify-between p-3 rounded-full border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    className={`px-6 py-2 rounded-full hover:scale-[1.02] hover:shadow-xl transition-colors ${
                      activeStep === 0
                        ? 'border border-gray-300 text-gray-400 cursor-not-allowed'
                        : ' bg-[#f54502]/20 text-[#f54502] hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={activeStep === 2 || isLoading}
                    className={`px-6 py-2 rounded-full hover:scale-[1.02] hover:shadow-xl transition-colors flex items-center justify-center gap-2 ${
                      activeStep === 2 || isLoading
                        ? 'hidden cursor-not-allowed'
                        : 'bg-[#f54502] text-white hover:bg-[#f54502]/90'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : activeStep === 2 ? (
                      ' '
                    ) : (
                      'Next'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default TicketTypeForm;