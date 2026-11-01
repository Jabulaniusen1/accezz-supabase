'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/app/components/layout/Header';
import Toast from '@/components/ui/Toast';
import EventNotFound from '@/components/EventNotFound';
import CreateAccountPrompt from '@/app/components/CreateAccountPrompt';
import { ArrowLeft } from '@/icon-adapters/lucide-react';
import type { Event } from '@/types/event';
import { fetchEventBySlug, isEventPast } from '@/utils/eventUtils';
import { createOrder, fetchOrderDetails, startPaystackCheckout } from '@/utils/paymentUtils';
import { calculateOrderCharges, type OrderCharges } from '@/utils/fees';
import { formatPrice } from '@/utils/formatPrice';
import { clearTicketPurchaseState, getTicketPurchaseState, saveTicketPurchaseState } from '@/utils/localStorage';
import { supabase } from '@/utils/supabaseClient';
import { getSession } from '@/utils/supabaseAuth';
import { useIsLoggedIn } from '@/hooks/useIsLoggedIn';
import CheckoutStepper from './CheckoutStepper';
import CheckoutSkeleton from './CheckoutSkeleton';
import TicketPicker from './TicketPicker';
import BuyerDetailsForm from './BuyerDetailsForm';
import ReviewStep from './ReviewStep';
import OrderSummary from './OrderSummary';
import {
  EMPTY_HOLDER,
  maxPerOrder,
  orderSignature,
  parsePrice,
  ticketsLeft,
  validateDetails,
  type BuyerDetails,
  type CheckoutStep,
  type FieldErrors,
  type TicketHolder,
} from './checkout';

type ToastState = { type: 'success' | 'error' | 'info' | 'warning'; message: string } | null;

/** An order created on the server for the current choices */
type PlacedOrder = { id: string; charges: OrderCharges; signature: string };

/** /api/orders/[orderId], as far as resuming needs it */
type OrderLookup = {
  order: {
    id: string;
    status: string;
    buyer_full_name: string | null;
    buyer_email: string;
    buyer_phone: string | null;
    total_amount: number;
    service_fee?: number;
    processing_fee?: number;
    amount_due?: number;
    meta: {
      ticketTypeId?: string | null;
      ticketTypeName?: string | null;
      quantity?: number | null;
      attendees?: Array<{ name?: string; email?: string; gender?: string | null }> | null;
      primaryBuyerGender?: string | null;
    } | null;
  };
  event: { id: string } | null;
};

const EMPTY_BUYER: BuyerDetails = { fullName: '', email: '', phone: '', gender: '' };

const STEP_COPY: Record<CheckoutStep, { title: string; text: string }> = {
  0: { title: 'Choose your tickets', text: 'Pick a ticket type and how many you need.' },
  1: { title: 'Your details', text: 'We’ll send your tickets and receipt to this email.' },
  2: { title: 'Review and pay', text: 'Check everything before you pay.' },
};

const resizeHolders = (holders: TicketHolder[], count: number) =>
  count <= 0 ? [] : Array.from({ length: count }, (_, i) => holders[i] || { ...EMPTY_HOLDER });

export default function CheckoutFlow() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = typeof params?.id === 'string' ? params.id : '';
  const [isLoggedIn] = useIsLoggedIn();

  const [event, setEvent] = useState<Event | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [initialized, setInitialized] = useState(false);

  const [step, setStep] = useState<CheckoutStep>(0);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyer, setBuyer] = useState<BuyerDetails>(EMPTY_BUYER);
  const [useSameDetails, setUseSameDetails] = useState(true);
  const [holders, setHolders] = useState<TicketHolder[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [accountPromptOrderId, setAccountPromptOrderId] = useState<string | null>(null);
  const prefilled = useRef(false);
  const initStarted = useRef(false);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (next) window.setTimeout(() => setToast(null), 4000);
  }, []);
  const showError = useCallback((err: unknown, fallback: string) => {
    showToast({ type: 'error', message: err instanceof Error && err.message ? err.message : fallback });
  }, [showToast]);

  // ── Load the event ──────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetchEventBySlug(slug)
      .then((ev) => {
        if (!active) return;
        if (ev) { setEvent(ev); setLoadState('ready'); } else setLoadState('not_found');
      })
      .catch(() => { if (active) setLoadState('error'); });
    return () => { active = false; };
  }, [slug]);

  // ── Initial state: resume an order, restore a draft, or start fresh ──
  useEffect(() => {
    if (!event || initialized || initStarted.current) return;
    initStarted.current = true;
    const tickets = event.ticketType || [];
    const available = tickets.filter((t) => ticketsLeft(t) > 0);

    const init = async () => {
      // 1) Link from an abandoned-cart email: /{slug}/checkout?orderId=...
      const resumeId = searchParams?.get('orderId');
      if (resumeId) {
        try {
          const { order: o, event: orderEvent } = await fetchOrderDetails<OrderLookup>(resumeId);
          if (orderEvent?.id === event.id && o.status === 'paid') {
            router.replace(`/invoice/${o.id}`);
            return;
          }
          const ticket = tickets.find((t) => (o.meta?.ticketTypeId ? t.id === o.meta.ticketTypeId : t.name === o.meta?.ticketTypeName));
          if (orderEvent?.id === event.id && o.status === 'pending' && ticket) {
            const qty = Math.max(1, Number(o.meta?.quantity) || 1);
            const restoredBuyer: BuyerDetails = {
              fullName: o.buyer_full_name || '',
              email: o.buyer_email || '',
              phone: o.buyer_phone || '',
              gender: o.meta?.primaryBuyerGender || '',
            };
            const attendees = (o.meta?.attendees || []).map((a) => ({ name: a.name || '', email: a.email || '', gender: a.gender || '' }));
            const same = attendees.every((a) => a.name === restoredBuyer.fullName && a.email.toLowerCase() === restoredBuyer.email.toLowerCase());
            const restoredHolders = same ? resizeHolders([], qty - 1) : resizeHolders(attendees, qty - 1);
            setTicketId(ticket.id);
            setQuantity(qty);
            setBuyer(restoredBuyer);
            setUseSameDetails(same);
            setHolders(restoredHolders);
            setOrder({
              id: o.id,
              charges: {
                subtotal: Number(o.total_amount) || 0,
                serviceFee: Number(o.service_fee) || 0,
                processingFee: Number(o.processing_fee) || 0,
                total: Number(o.amount_due ?? o.total_amount) || 0,
              },
              signature: orderSignature(ticket.id, qty, restoredBuyer, same, restoredHolders),
            });
            setStep(2);
            prefilled.current = true;
            setInitialized(true);
            return;
          }
          showToast({ type: 'info', message: 'That order is no longer open. Please choose your tickets again.' });
        } catch {
          showToast({ type: 'info', message: 'We couldn’t find that order. Please choose your tickets again.' });
        }
      }

      // 2) A draft saved earlier in this browser
      const saved = getTicketPurchaseState();
      let draftTicket: string | null = null;
      if (saved?.eventSlug === slug) {
        draftTicket = saved.selectedTicket?.id || null;
        setBuyer({
          fullName: saved.fullName || '',
          email: saved.email || '',
          phone: saved.phoneNumber || '',
          gender: saved.gender || '',
        });
        if (typeof saved.useSameDetails === 'boolean') setUseSameDetails(saved.useSameDetails);
        if (Array.isArray(saved.additionalTicketHolders)) {
          setHolders(saved.additionalTicketHolders.map((h: Partial<TicketHolder>) => ({ name: h.name || '', email: h.email || '', gender: h.gender || '' })));
        }
        if (saved.orderId && saved.orderCharges && saved.orderSignature) {
          setOrder({ id: saved.orderId, charges: saved.orderCharges, signature: saved.orderSignature });
        }
      }

      // 3) The ticket picked on the event page wins over the draft
      const requested = searchParams?.get('ticket') || null;
      const requestedTicket = requested ? available.find((t) => t.id === requested) : undefined;
      const draft = draftTicket ? available.find((t) => t.id === draftTicket) : undefined;
      const initial = requestedTicket || draft || (available.length === 1 ? available[0] : undefined);

      if (initial) {
        setTicketId(initial.id);
        const keepDraft = draft && initial.id === draft.id;
        const qty = keepDraft ? Math.min(Math.max(1, saved?.quantity || 1), maxPerOrder(initial)) : 1;
        setQuantity(qty);
        setHolders((prev) => resizeHolders(prev, qty - 1));
        if (keepDraft && !requestedTicket && saved?.activeStep && saved.activeStep > 0) {
          // Back where they left off (review only if the order still exists)
          setStep(saved.activeStep >= 2 && saved.orderId ? 2 : 1);
        }
      }
      setInitialized(true);
    };
    init();
  }, [event, initialized, router, searchParams, showToast, slug]);

  // ── Prefill from the signed-in profile ──────────────────────
  useEffect(() => {
    if (!initialized || !isLoggedIn || prefilled.current) return;
    prefilled.current = true;
    (async () => {
      try {
        const session = await getSession();
        if (!session) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setBuyer((b) => ({
          ...b,
          fullName: b.fullName || profile?.full_name || session.user.user_metadata?.full_name || '',
          email: b.email || session.user.email || '',
          phone: b.phone || profile?.phone || session.user.user_metadata?.phone || '',
        }));
      } catch {
        // prefill is a convenience only
      }
    })();
  }, [initialized, isLoggedIn]);

  // ── Derived ──────────────────────────────────────────────────
  const tickets = useMemo(() => event?.ticketType || [], [event]);
  const selectedTicket = tickets.find((t) => t.id === ticketId) || null;
  const signature = orderSignature(ticketId, quantity, buyer, useSameDetails, holders);
  const orderIsCurrent = Boolean(order && order.signature === signature);
  const estimatedCharges = useMemo(
    () => calculateOrderCharges(parsePrice(selectedTicket?.price) * quantity),
    [selectedTicket, quantity],
  );
  const charges = order && orderIsCurrent ? order.charges : estimatedCharges;
  const payable = charges.total > 0;
  const ended = event ? isEventPast(event) : false;
  const anyAvailable = tickets.some((t) => ticketsLeft(t) > 0);

  // ── Save progress (2 hours, this browser only) ──────────────
  useEffect(() => {
    if (!initialized || !slug) return;
    saveTicketPurchaseState({
      eventSlug: slug,
      showTicketForm: true,
      activeStep: step,
      selectedTicket: selectedTicket || undefined,
      quantity,
      fullName: buyer.fullName,
      email: buyer.email,
      phoneNumber: buyer.phone,
      gender: buyer.gender,
      totalPrice: charges.total,
      orderId: order?.id,
      orderCharges: order?.charges,
      orderSignature: order?.signature,
      useSameDetails,
      additionalTicketHolders: holders,
    });
  }, [initialized, slug, step, selectedTicket, quantity, buyer, useSameDetails, holders, order, charges.total]);

  // ── Actions ─────────────────────────────────────────────────
  const goTo = (next: CheckoutStep) => {
    setStep(next);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectTicket = (id: string) => {
    if (id !== ticketId) {
      setTicketId(id);
      setQuantity(1);
      setHolders([]);
    }
    setErrors({});
  };

  const changeQuantity = (next: number) => {
    setQuantity(next);
    setHolders((prev) => resizeHolders(prev, next - 1));
  };

  const updateBuyer = (field: keyof BuyerDetails, value: string) => {
    setBuyer((b) => ({ ...b, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const updateHolder = (index: number, field: keyof TicketHolder, value: string) => {
    setHolders((prev) => {
      const next = resizeHolders(prev, quantity - 1);
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    const key = `holder-${index}-${field}`;
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  /** Create the order on the server (it sets the price). */
  const placeOrder = async (): Promise<{ id: string; free: boolean }> => {
    if (!event?.id || !selectedTicket) throw new Error('Choose a ticket first');
    let affiliateCode: string | null = null;
    try { affiliateCode = localStorage.getItem('affiliateRef'); } catch { /* ignore */ }

    const others = quantity > 1
      ? (useSameDetails
          ? Array.from({ length: quantity - 1 }, () => ({ name: buyer.fullName, email: buyer.email, gender: buyer.gender }))
          : holders.slice(0, quantity - 1)
        ).map((h) => ({ name: h.name.trim(), email: h.email.trim(), gender: h.gender || undefined }))
      : null;

    const result = await createOrder({
      eventId: event.id,
      ticketTypeId: selectedTicket.id,
      ticketTypeName: selectedTicket.name,
      quantity,
      email: buyer.email.trim(),
      phone: buyer.phone.trim(),
      fullName: buyer.fullName.trim(),
      gender: buyer.gender,
      attendees: others,
      affiliateCode,
    });
    if (result.free) return { id: result.orderId, free: true };

    const placedCharges = {
      subtotal: result.subtotal,
      serviceFee: result.serviceFee,
      processingFee: result.processingFee,
      total: result.total,
    };
    setOrder({ id: result.orderId, charges: placedCharges, signature });
    try {
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId: result.orderId, eventId: event.id, eventSlug: slug, email: buyer.email, amount: result.total, currency: 'NGN',
      }));
    } catch { /* non-critical */ }
    return { id: result.orderId, free: false };
  };

  /** Free tickets are issued straight away */
  const finishFreeOrder = async (id: string) => {
    clearTicketPurchaseState();
    const session = await getSession();
    if (!session) {
      setBusy(false);
      setAccountPromptOrderId(id);
      return;
    }
    window.location.href = `/invoice/${id}`;
  };

  const handlePrimary = async () => {
    if (busy) return;

    if (step === 0) {
      if (!selectedTicket) {
        setErrors({ ticket: 'Choose a ticket to continue' });
        return;
      }
      goTo(1);
      return;
    }

    if (step === 1) {
      const found = validateDetails(buyer, quantity, useSameDetails, holders);
      const keys = Object.keys(found);
      if (keys.length) {
        setErrors(found);
        document.getElementById(keys[0])?.focus();
        return;
      }
      setErrors({});
      if (!payable || orderIsCurrent) {
        goTo(2);
        return;
      }
      setBusy(true);
      try {
        const placed = await placeOrder();
        if (placed.free) {
          await finishFreeOrder(placed.id);
          return;
        }
        goTo(2);
      } catch (err) {
        showError(err, 'Could not create your order. Please try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Review and pay
    if (ended) {
      showToast({ type: 'error', message: 'This event has already ended.' });
      return;
    }
    setBusy(true);
    try {
      let id = order && orderIsCurrent ? order.id : null;
      if (!id) {
        const placed = await placeOrder();
        if (placed.free) {
          await finishFreeOrder(placed.id);
          return;
        }
        if (!payable) {
          // The ticket has just been given a price: show the new total first
          setBusy(false);
          showToast({ type: 'info', message: 'This ticket now has a price. Check your total and pay.' });
          return;
        }
        id = placed.id;
      }
      const url = await startPaystackCheckout(id);
      clearTicketPurchaseState();
      try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
      window.location.href = url;
    } catch (err) {
      setBusy(false);
      showError(err, 'Could not start payment. Please try again.');
    }
  };

  const primaryLabel = (() => {
    if (step === 0) return 'Continue';
    if (step === 1) return busy ? 'Saving your order…' : payable ? 'Continue to payment' : 'Continue';
    if (busy) return payable ? 'Taking you to Paystack…' : 'Getting your tickets…';
    return payable ? `Pay ${formatPrice(charges.total, 'NGN')}` : `Get my free ticket${quantity > 1 ? 's' : ''}`;
  })();

  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/${slug}/checkout${ticketId ? `?ticket=${ticketId}` : ''}`)}`;

  // ── Render ──────────────────────────────────────────────────
  if (loadState === 'not_found') return <EventNotFound />;

  const primaryButton = (extra = '') => (
    <button
      type="button"
      onClick={handlePrimary}
      disabled={busy || (step === 0 && !selectedTicket)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 ${extra}`}
    >
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {primaryLabel}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {accountPromptOrderId && (
        <CreateAccountPrompt
          isOpen
          onClose={() => { window.location.href = `/invoice/${accountPromptOrderId}`; }}
          buyerEmail={buyer.email}
          orderId={accountPromptOrderId}
        />
      )}

      {loadState === 'loading' || (loadState === 'ready' && !initialized) ? (
        <CheckoutSkeleton />
      ) : loadState === 'error' || !event ? (
        <div className="page-container py-24 text-center">
          <p className="text-gray-700 dark:text-gray-300">We couldn&apos;t load this event. Please try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Retry
          </button>
        </div>
      ) : (
        <main className="page-container pb-36 pt-6 lg:pb-16">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-brand dark:text-gray-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to event
          </Link>

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Checkout</h1>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400 sm:text-base">{event.title}</p>
          </div>

          {ended || !anyAvailable ? (
            <div className="mt-8 max-w-2xl rounded-card border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {ended ? 'Ticket sales have ended' : tickets.length ? 'This event is sold out' : 'Tickets aren’t on sale yet'}
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {ended ? 'This event has already taken place.' : 'Check back later or explore other events.'}
              </p>
              <Link href="/events" className="mt-6 inline-flex rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark">
                Explore events
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 max-w-2xl">
                <CheckoutStepper current={step} onSelect={goTo} disabled={busy} />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8">
                <div className="lg:hidden">
                  <OrderSummary event={event} ticket={selectedTicket} quantity={quantity} charges={charges} variant="compact" />
                </div>

                <section className="rounded-card border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{STEP_COPY[step].title}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{STEP_COPY[step].text}</p>

                  <div className="mt-6">
                    {step === 0 && (
                      <TicketPicker
                        tickets={tickets}
                        selectedId={ticketId}
                        quantity={quantity}
                        onSelect={selectTicket}
                        onQuantityChange={changeQuantity}
                        error={errors.ticket}
                      />
                    )}
                    {step === 1 && (
                      <BuyerDetailsForm
                        buyer={buyer}
                        onBuyerChange={updateBuyer}
                        quantity={quantity}
                        useSameDetails={useSameDetails}
                        onUseSameDetailsChange={setUseSameDetails}
                        holders={holders}
                        onHolderChange={updateHolder}
                        errors={errors}
                        isLoggedIn={isLoggedIn}
                        loginHref={loginHref}
                      />
                    )}
                    {step === 2 && selectedTicket && (
                      <ReviewStep
                        ticketName={selectedTicket.name}
                        quantity={quantity}
                        subtotal={charges.subtotal}
                        buyer={buyer}
                        useSameDetails={useSameDetails}
                        holders={holders}
                        isFree={!payable}
                        onEdit={goTo}
                      />
                    )}
                  </div>

                  <div className={`mt-8 items-center justify-between gap-3 border-t border-gray-100 pt-6 dark:border-gray-700 ${step === 0 ? 'hidden lg:flex' : 'flex'}`}>
                    {step > 0 ? (
                      <button
                        type="button"
                        onClick={() => goTo((step - 1) as CheckoutStep)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                    ) : <span />}
                    {primaryButton('hidden lg:inline-flex min-w-[200px]')}
                  </div>
                </section>

                <aside className="hidden lg:sticky lg:top-24 lg:block">
                  <OrderSummary event={event} ticket={selectedTicket} quantity={quantity} charges={charges} variant="sidebar" />
                </aside>
              </div>

              {/* Small screens: total and the next action always in reach */}
              <div
                data-mobile-bottom-bar
                className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-900 lg:hidden"
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedTicket ? (payable ? formatPrice(charges.total, 'NGN') : 'Free') : '—'}
                    </p>
                  </div>
                  {primaryButton('flex-1')}
                </div>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
