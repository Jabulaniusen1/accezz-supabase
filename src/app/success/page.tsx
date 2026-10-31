'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { supabase } from "@/utils/supabaseClient";
import { clearTicketPurchaseState } from "@/utils/localStorage";
import { fetchOrderDetails } from "@/utils/paymentUtils";

type OrderSnapshot = {
  id: string;
  status: string;
};

type OrderDetails = {
  order: OrderSnapshot;
  event: { id: string; slug: string | null } | null;
  tickets: Array<{ id: string }>;
};

const POLL_INTERVAL_MS = 1500;
const MAX_PROCESSING_ATTEMPTS = 40; // ~60 seconds

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceParam = searchParams.get('reference');
  const ticketIdParam = searchParams.get('ticketId');
  const orderIdParam = searchParams.get('orderId');
  const statusParam = searchParams.get('status');
  const [isVerifying, setIsVerifying] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Verifying your payment...');
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  const redirectToInvoice = (targetOrderId: string) => {
    const destination = `/invoice/${targetOrderId}`;
    // Use hard navigation for reliability in payment completion flows.
    window.location.replace(destination);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async (targetOrderId: string): Promise<OrderDetails | null> => {
      try {
        return await fetchOrderDetails<OrderDetails>(targetOrderId);
      } catch {
        return null;
      }
    };

    const waitForTicketProcessing = async (targetOrderId: string): Promise<{ orderData: OrderSnapshot | null; failed: boolean; hasTicket: boolean }> => {
      let latestOrder: OrderSnapshot | null = null;

      for (let attempt = 0; attempt < MAX_PROCESSING_ATTEMPTS; attempt++) {
        const details = await fetchDetails(targetOrderId);
        if (details) {
          latestOrder = details.order;
        }

        const currentStatus = latestOrder?.status || '';
        const hasTicket = Boolean(details && details.tickets.length > 0);

        if (currentStatus === 'failed' || currentStatus === 'cancelled' || currentStatus === 'refunded') {
          return { orderData: latestOrder, failed: true, hasTicket };
        }

        if (currentStatus === 'paid' && hasTicket) {
          return { orderData: latestOrder, failed: false, hasTicket };
        }

        if (!cancelled) {
          setStatusMessage(
            currentStatus === 'paid'
              ? 'Finalizing your ticket...'
              : 'Confirming payment and generating your ticket...'
          );
        }

        await sleep(POLL_INTERVAL_MS);
      }

      return { orderData: latestOrder, failed: false, hasTicket: false };
    };

    const verifyPayment = async () => {
      const reference = referenceParam;
      const urlTicketId = ticketIdParam;
      const urlOrderId = orderIdParam;
      const status = statusParam;

      // Store event slug from localStorage for later use before clearing
      let storedEventSlug: string | null = null;
      try {
        const raw = localStorage.getItem('pendingPayment');
        if (raw) {
          const p = JSON.parse(raw) as { eventSlug?: string };
          if (p.eventSlug) {
            setEventSlug(p.eventSlug);
            storedEventSlug = p.eventSlug;
          }
        }
      } catch (e) {
        console.error('Failed to read pendingPayment from localStorage:', e instanceof Error ? e.message : e);
      }

      // Handle explicit failure cases
      if (status === 'cancelled') {
        try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
        try { localStorage.removeItem('pendingPaystackCheckout'); } catch { /* ignore */ }
        try { clearTicketPurchaseState(); } catch { /* ignore */ }

        if (storedEventSlug) {
          router.replace(`/${storedEventSlug}`);
          return;
        }

        if (urlOrderId) {
          const details = await fetchDetails(urlOrderId);
          const target = details?.event?.slug || details?.event?.id;
          if (target) {
            router.replace(`/${target}`);
            return;
          }
        }

        router.back();
        return;
      }

      if (status === 'failed') {
        try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
        try { localStorage.removeItem('pendingPaystackCheckout'); } catch { /* ignore */ }
        try { clearTicketPurchaseState(); } catch { /* ignore */ }
        if (!cancelled) {
          setShowFailureModal(true);
          setIsVerifying(false);
        }
        return;
      }

      if (status === 'pending') {
        router.push(`/payment-pending${urlTicketId ? `?ticketId=${urlTicketId}` : ''}`);
        return;
      }

      try {
        // If ticketId exists in URL, redirect to invoice (for backward compatibility)
        if (urlTicketId) {
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('order_id')
            .eq('id', urlTicketId)
            .single();

          const orderIdFromTicket = (ticketData as { order_id?: string | null } | null)?.order_id || null;
          if (orderIdFromTicket) {
            redirectToInvoice(orderIdFromTicket);
            return;
          }

          if (!cancelled) setIsVerifying(false);
          return;
        }

        let resolvedOrderId = urlOrderId;
        let paymentPending = false;

        // Verify via Paystack API when reference is present
        if (reference) {
          if (!cancelled) setStatusMessage('Verifying your payment...');
          const vRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
          const vData = await vRes.json() as { status?: string; error?: string; orderId?: string };
          if (!vRes.ok || !vData?.status) {
            throw new Error(vData?.error || 'Verification failed');
          }

          if (vData.status === 'pending') {
            // Bank transfer / USSD still settling: the webhook will issue the
            // tickets once it clears, so keep waiting instead of failing.
            paymentPending = true;
          } else if (vData.status !== 'success') {
            if (!cancelled) {
              setShowFailureModal(true);
              setIsVerifying(false);
            }
            return;
          }

          resolvedOrderId = vData.orderId || resolvedOrderId;
        }

        if (!resolvedOrderId) {
          throw new Error('Missing reference, ticketId, or orderId');
        }

        if (!cancelled) setStatusMessage('Confirming payment and generating your ticket...');
        const { orderData, failed, hasTicket } = await waitForTicketProcessing(resolvedOrderId);

        if (failed) {
          if (!cancelled) {
            setShowFailureModal(true);
            setIsVerifying(false);
          }
          return;
        }

        if (paymentPending && !hasTicket && orderData?.status !== 'paid') {
          if (!cancelled) {
            setPendingOrderId(resolvedOrderId);
            setIsVerifying(false);
          }
          return;
        }

        try { clearTicketPurchaseState(); } catch { /* ignore */ }
        try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
        try { localStorage.removeItem('pendingPaystackCheckout'); } catch { /* ignore */ }

        if (!cancelled) {
          setIsVerifying(false);
        }

        redirectToInvoice(resolvedOrderId);
        return;
      } catch (error: unknown) {
        console.error('Payment verification error:', error);
        if (!cancelled) {
          setShowFailureModal(true);
          setIsVerifying(false);
        }
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [referenceParam, ticketIdParam, orderIdParam, statusParam, router]);

  if (pendingOrderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6 space-y-4">
          <div className="animate-pulse rounded-full h-12 w-12 bg-[#f54502]/20 mx-auto"></div>
          <h1 className="text-xl font-semibold text-gray-900">Your payment is still being confirmed</h1>
          <p className="text-gray-700">
            Your bank hasn&apos;t confirmed the payment yet. This can take a few minutes for bank transfers and USSD.
            <strong> Please don&apos;t pay again.</strong> We&apos;ll email your tickets as soon as it clears.
          </p>
          <a
            href={`/invoice/${pendingOrderId}`}
            className="inline-block py-3 px-6 rounded-xl bg-[#f54502] hover:bg-[#d63a02] text-white font-semibold"
          >
            View order status
          </a>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f54502] mx-auto"></div>
          <p className="mt-4 text-gray-700">{statusMessage}</p>
          <p className="mt-2 text-sm text-gray-500">Please wait. You do not need to refresh this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showFailureModal && (
        <PaymentFailedModal
          onClose={async () => {
            setShowFailureModal(false);
            if (eventSlug) {
              router.replace(`/${eventSlug}`);
              return;
            }
            router.back();
          }}
          onTryAgain={async () => {
            setShowFailureModal(false);
            if (eventSlug) {
              router.replace(`/${eventSlug}`);
              return;
            }
            router.back();
          }}
        />
      )}
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f54502] mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to invoice...</p>
        </div>
      </div>
    </>
  );
};

const SuccessPage = () => {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
};

export default SuccessPage;
