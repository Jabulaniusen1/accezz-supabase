import React, { useEffect, useMemo, useState, useRef } from 'react';
import TicketSelectionStep from './TicketFormSec/TicketSelectionStep';
import OrderInformationStep from './TicketFormSec/OrderInformationStep';
import PaymentStep from './TicketFormSec/PaymentStep';
import CreateAccountPrompt from './CreateAccountPrompt';
import { fetchEventBySlug, isEventPast } from '@/utils/eventUtils';
import { createOrder, createFreeTickets } from '@/utils/paymentUtils';
import { saveTicketPurchaseState, getTicketPurchaseState, clearTicketPurchaseState } from '@/utils/localStorage';
import { supabase } from '@/utils/supabaseClient';
import { getSession } from '@/utils/supabaseAuth';
import { useTicketPurchase } from '@/contexts/TicketPurchaseContext';
import { Event } from '@/types/event';
import { FaCheckCircle, FaTimes, FaArrowLeft } from 'react-icons/fa';

type TicketOption = {
  id: string;
  name: string;
  price: string;
  quantity: string;
  sold: string;
  details?: string;
};

type TicketTypeFormProps = {
  closeForm: () => void;
  tickets: TicketOption[];
  eventSlug: string;
  setToast: (toast: { type: 'success' | 'error'; message: string } | null) => void;
  isOpen?: boolean;
  initialTicket?: TicketOption;
};

interface EventBasic { id: string; slug: string; }

const parsePriceValue = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const STEPS = ['Select Ticket', 'Your Details', 'Payment'];

const TicketTypeForm = ({
  closeForm,
  tickets,
  eventSlug,
  setToast,
  isOpen = true,
  initialTicket,
}: TicketTypeFormProps) => {
  const { setIsPurchasing } = useTicketPurchase();

  // — Step state —
  const [activeStep, setActiveStep] = useState(0);

  // — Ticket selection —
  const [selectedTicket, setSelectedTicket] = useState<TicketOption | null>(initialTicket ?? null);
  const [quantity, setQuantity] = useState(1);

  // — Attendee details —
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [additionalTicketHolders, setAdditionalTicketHolders] = useState<
    Array<{ name: string; email: string; phone?: string; gender?: string }>
  >([]);
  const [useSameDetails, setUseSameDetails] = useState(true);

  // — Async / UI —
  const [events, setEvent] = useState<EventBasic | null>(null);
  const [fullEvent, setFullEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoadedUserInfo, setHasLoadedUserInfo] = useState(false);
  const fieldsRef = useRef({ fullName, email, phoneNumber });

  const eventId = events?.id;

  const totalPrice = useMemo(
    () => parsePriceValue(selectedTicket?.price) * quantity,
    [selectedTicket, quantity],
  );

  // Animate-in on mount
  useEffect(() => { setIsVisible(true); }, []);

  // Fetch event
  useEffect(() => {
    if (!eventSlug || typeof eventSlug !== 'string') return;
    const fetchEvent = async () => {
      try {
        const fetchedEvent = await fetchEventBySlug(eventSlug);
        if (fetchedEvent) {
          setEvent({ id: fetchedEvent.id || '', slug: fetchedEvent.slug || '' });
          setFullEvent(fetchedEvent);
          if (isEventPast(fetchedEvent)) {
            setToast({ type: 'error', message: 'This event has already ended.' });
            setTimeout(closeForm, 2000);
          }
        } else {
          setToast({ type: 'error', message: 'Event not found' });
        }
      } catch {
        setToast({ type: 'error', message: 'Failed to load event details' });
      }
    };
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  // Restore saved state
  useEffect(() => {
    try {
      const saved = getTicketPurchaseState();
      if (saved?.eventSlug === eventSlug && saved.showTicketForm) {
        if (saved.activeStep !== undefined) setActiveStep(saved.activeStep);
        if (saved.selectedTicket)          setSelectedTicket(saved.selectedTicket);
        if (saved.quantity !== undefined)  setQuantity(saved.quantity);
        if (saved.fullName)    setFullName(saved.fullName);
        if (saved.email)       setEmail(saved.email);
        if (saved.phoneNumber) setPhoneNumber(saved.phoneNumber);
        if (saved.gender)      setGender(saved.gender);
        if (saved.orderId)     setOrderId(saved.orderId);
        if (saved.additionalTicketHolders) setAdditionalTicketHolders(saved.additionalTicketHolders);
      }
    } catch {
      // ignore
    }
  }, [eventSlug]);

  // Keep ref in sync
  useEffect(() => { fieldsRef.current = { fullName, email, phoneNumber }; }, [fullName, email, phoneNumber]);

  // Pre-fill from Supabase profile
  const preFillUserInfo = async () => {
    if (hasLoadedUserInfo) return;
    try {
      const saved = getTicketPurchaseState();
      const hasSaved = saved?.eventSlug === eventSlug &&
        saved.showTicketForm &&
        saved.fullName?.trim() &&
        saved.email?.trim() &&
        saved.phoneNumber?.trim();
      if (hasSaved) { setHasLoadedUserInfo(true); return; }

      const session = await getSession();
      if (!session) { setHasLoadedUserInfo(true); return; }

      const { fullName: fn, email: em, phoneNumber: ph } = fieldsRef.current;
      if (fn || em || ph) { setHasLoadedUserInfo(true); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', session.user.id)
        .single();

      const userName  = profile?.full_name || session.user.user_metadata?.full_name || '';
      const userEmail = session.user.email || '';
      const userPhone = profile?.phone || session.user.user_metadata?.phone || '';

      if (userName  && !fieldsRef.current.fullName)    setFullName(userName);
      if (userEmail && !fieldsRef.current.email)        setEmail(userEmail);
      if (userPhone && !fieldsRef.current.phoneNumber)  setPhoneNumber(userPhone);
      setHasLoadedUserInfo(true);
    } catch {
      setHasLoadedUserInfo(true);
    }
  };

  // Context sync
  useEffect(() => {
    setIsPurchasing(isOpen);
    return () => { setIsPurchasing(false); };
  }, [isOpen, setIsPurchasing]);

  // Pre-fill on open and when reaching step 1
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(preFillUserInfo, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventSlug]);

  useEffect(() => {
    if (!isOpen || activeStep !== 1 || hasLoadedUserInfo) return;
    const t = setTimeout(preFillUserInfo, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, isOpen]);

  useEffect(() => { if (!isOpen) setHasLoadedUserInfo(false); }, [isOpen]);

  // Sync initialTicket prop
  useEffect(() => {
    if (!initialTicket) return;
    setSelectedTicket(prev => {
      if (prev?.name === initialTicket.name && prev?.price === initialTicket.price) return prev;
      return { ...initialTicket };
    });
    setActiveStep(0);
    setQuantity(1);
    setAdditionalTicketHolders([]);
  }, [initialTicket]);

  // Persist state
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
    } catch {
      // ignore
    }
  }, [activeStep, selectedTicket, quantity, fullName, email, phoneNumber, gender, totalPrice, orderId, additionalTicketHolders, eventSlug, isOpen]);

  // ── Handlers ────────────────────────────────────────────────

  const handleTicketSelection = (ticket: TicketOption) => {
    setSelectedTicket({ ...ticket });
    setQuantity(1);
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    if (newQty > 1) setUseSameDetails(true);
    setAdditionalTicketHolders(prev => {
      if (newQty <= 1) return [];
      if (newQty - 1 > prev.length)
        return [...prev, ...Array(newQty - 1 - prev.length).fill({ name: '', email: '', phone: '', gender: '' })];
      return prev.slice(0, newQty - 1);
    });
  };

  const handleAdditionalTicketHolderChange = (index: number, field: string, value: string) => {
    setAdditionalTicketHolders(prev => {
      const updated = [...prev];
      if (!updated[index]) updated[index] = { name: '', email: '' };
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!selectedTicket) {
        setToast({ type: 'error', message: 'Please select a ticket to continue.' });
        return;
      }
      setActiveStep(1);
      return;
    }

    if (activeStep === 1) {
      if (!fullName || !phoneNumber || !email || !gender) {
        setToast({ type: 'error', message: 'Please fill in all required fields.' });
        return;
      }

      const allAttendees = [{ name: fullName, email, gender: gender || undefined }];

      if (quantity > 1) {
        if (useSameDetails) {
          for (let i = 1; i < quantity; i++) allAttendees.push({ name: fullName, email, gender: gender || undefined });
        } else {
          if (additionalTicketHolders.length < quantity - 1) {
            setToast({ type: 'error', message: 'Please fill in details for all ticket holders.' });
            return;
          }
          for (let i = 0; i < quantity - 1; i++) {
            const h = additionalTicketHolders[i];
            if (!h?.name || !h?.email || !h?.gender) {
              setToast({ type: 'error', message: `Please complete details for Ticket Holder #${i + 2}.` });
              return;
            }
          }
          allAttendees.push(...additionalTicketHolders.slice(0, quantity - 1).map(h => ({
            name: h.name, email: h.email, gender: h.gender || undefined,
          })));
        }
      }

      if (!eventId || !selectedTicket) {
        setToast({ type: 'error', message: 'Missing event or ticket information.' });
        return;
      }

      // Free tickets skip order creation
      if (parsePriceValue(selectedTicket.price) === 0) {
        setActiveStep(2);
        return;
      }

      // Create order for paid tickets
      try {
        setIsLoading(true);
        const { orderId: createdOrderId } = await createOrder({
          eventId,
          ticketTypeName: selectedTicket.name,
          quantity: allAttendees.length,
          email,
          phone: phoneNumber,
          fullName,
          gender,
          attendees: allAttendees.length > 1 ? allAttendees.slice(1) : null,
          currency: 'NGN',
        });

        setOrderId(createdOrderId);

        try {
          localStorage.setItem('pendingPayment', JSON.stringify({
            orderId: createdOrderId, eventId, eventSlug, email, amount: totalPrice, currency: 'NGN',
          }));
        } catch { /* non-critical */ }

        setActiveStep(2);
      } catch (error: unknown) {
        setToast({ type: 'error', message: (error as Error).message || 'Could not create order.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);

    if (!eventId || !selectedTicket) {
      setIsLoading(false);
      setToast({ type: 'error', message: 'Missing information.' });
      return;
    }

    if (fullEvent && isEventPast(fullEvent)) {
      setIsLoading(false);
      setToast({ type: 'error', message: 'This event has already ended.' });
      return;
    }

    const allAttendees = [{ name: fullName, email, gender: gender || undefined }];
    if (additionalTicketHolders.length > 0)
      allAttendees.push(...additionalTicketHolders.map(h => ({ name: h.name, email: h.email, gender: h.gender || undefined })));
    const attendees = allAttendees.length > 1 ? allAttendees.slice(1) : null;
    const ticketPrice = parsePriceValue(selectedTicket.price);

    try {
      // ── Free tickets ──
      if (ticketPrice === 0) {
        try {
          const { orderId: createdOrderId } = await createFreeTickets({
            eventId, ticketTypeName: selectedTicket.name, quantity, email,
            phone: phoneNumber, fullName, gender, attendees, currency: 'NGN',
          });
          clearTicketPurchaseState();
          const session = await getSession();
          if (!session) {
            setPurchaseOrderId(createdOrderId);
            setShowAccountPrompt(true);
            setIsLoading(false);
            return;
          }
          window.location.href = `/invoice/${createdOrderId}`;
          return;
        } catch (error: unknown) {
          setIsLoading(false);
          setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Error creating free ticket') });
          return;
        }
      }

      // ── Paid tickets via Paystack ──
      if (!orderId) {
        setIsLoading(false);
        setToast({ type: 'error', message: 'Order not found. Please go back and try again.' });
        return;
      }

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId, amount: totalPrice, email, currency: 'NGN',
          callbackUrl: `${window.location.origin}/success?orderId=${orderId}`,
        }),
      });

      const data = await res.json() as { authorization_url?: string; access_code?: string; reference?: string; error?: string };
      if (!res.ok || !data?.authorization_url) throw new Error(data?.error || 'Failed to initialize payment');

      // Load Paystack script
      await new Promise<void>((resolve, reject) => {
        if (window.PaystackPop) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload  = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Paystack'));
        document.head.appendChild(script);
      });

      const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (!publicKey || !window.PaystackPop) throw new Error('Paystack not configured');

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount: Math.round(totalPrice * 100),
        currency: 'NGN',
        ref: data.reference || `ORD-${orderId}-${Date.now()}`,
        callback: (response: { reference: string }) => {
          // The Paystack webhook is the single source of truth.
          // It receives charge.success, marks the order paid, creates tickets,
          // sends confirmation emails, and triggers Inngest reminders.
          // The client only needs to hand the reference to the success page.
          clearTicketPurchaseState();
          try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
          window.location.href = `/success?orderId=${orderId}&reference=${encodeURIComponent(response.reference)}`;
        },
        onClose: () => {
          setIsLoading(false);
          setToast({ type: 'error', message: 'Payment cancelled.' });
        },
      });

      handler.openIframe();
    } catch (error: unknown) {
      setIsLoading(false);
      setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Error processing payment') });
    }
  };

  const handleBack = () => setActiveStep(s => s - 1);

  const handleClose = () => {
    clearTicketPurchaseState();
    closeForm();
  };

  const handleAccountPromptClose = () => {
    setShowAccountPrompt(false);
    if (purchaseOrderId) {
      supabase
        .from('tickets')
        .select('id')
        .eq('order_id', purchaseOrderId)
        .limit(1)
        .single()
        .then(({ data: ticket, error }) => {
          window.location.href = !error && ticket
            ? `/success?ticketId=${ticket.id}`
            : '/success';
        });
    }
  };

  const nextLabel = activeStep === 0
    ? 'Continue'
    : isLoading
      ? 'Creating order…'
      : 'Review & Pay';

  // ── Render ───────────────────────────────────────────────────

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

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      >
        {/* Modal */}
        <div
          className={`
            relative w-full sm:max-w-lg
            bg-white dark:bg-gray-900
            rounded-t-3xl sm:rounded-2xl
            shadow-2xl
            flex flex-col
            max-h-[92vh] sm:max-h-[88vh]
            transform transition-transform duration-300 ease-out
            ${isVisible ? 'translate-y-0' : 'translate-y-full sm:translate-y-0 sm:opacity-0'}
          `}
        >
          {/* Drag handle — mobile only */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Purchase Ticket</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Step {activeStep + 1} of {STEPS.length} — {STEPS[activeStep]}
              </p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>

          {/* ── Step indicator ── */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center">
              {STEPS.map((step, i) => (
                <React.Fragment key={i}>
                  {/* Circle */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                        ${i < activeStep
                          ? 'bg-[#f54502] text-white'
                          : i === activeStep
                            ? 'bg-[#f54502] text-white ring-4 ring-[#f54502]/20'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }
                      `}
                    >
                      {i < activeStep
                        ? <FaCheckCircle className="w-4 h-4" />
                        : <span className="text-xs font-bold">{i + 1}</span>
                      }
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-none
                        ${i <= activeStep ? 'text-[#f54502]' : 'text-gray-400 dark:text-gray-500'}
                      `}
                    >
                      {step}
                    </span>
                  </div>

                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-300
                        ${i < activeStep ? 'bg-[#f54502]' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
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
                useSameDetails={useSameDetails}
                setUseSameDetails={setUseSameDetails}
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

          {/* ── Footer navigation ── */}
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-5 py-4 flex gap-3">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaArrowLeft className="w-3 h-3" />
                Back
              </button>
            )}

            {activeStep < 2 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading || (activeStep === 0 && !selectedTicket)}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200
                  bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#d63a02] hover:to-[#b52e00]
                  shadow-md shadow-[#f54502]/20 hover:shadow-[#f54502]/30
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                  ${activeStep > 0 ? 'flex-1' : 'w-full'}
                `}
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating order…</span>
                  </>
                ) : (
                  nextLabel
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TicketTypeForm;
