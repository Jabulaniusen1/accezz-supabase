'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { startPaystackCheckout } from '@/utils/paymentUtils';

type PendingCheckoutSession = {
  orderId: string;
  authorizationUrl: string;
  createdAt: string;
};

const CHECKOUT_SESSION_KEY = 'pendingPaystackCheckout';
const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000;

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      const rawOrderId = searchParams.get('orderId');
      const status = searchParams.get('status');
      const reference = searchParams.get('reference') || searchParams.get('trxref');

      // If we get bounced back here with a reference, continue verification on success page.
      if (reference) {
        const nextOrderId = rawOrderId ? `&orderId=${encodeURIComponent(rawOrderId)}` : '';
        router.replace(`/success?reference=${encodeURIComponent(reference)}${nextOrderId}`);
        return;
      }

      // If Paystack redirected back with cancelled/failed status, send user back to event page.
      if (status === 'cancelled' || status === 'failed') {
        let eventSlug: string | null = null;
        try {
          const raw = localStorage.getItem('pendingPayment');
          if (raw) {
            const parsed = JSON.parse(raw) as { eventSlug?: string };
            eventSlug = parsed.eventSlug || null;
          }
        } catch {
          // ignore
        }

        try { localStorage.removeItem(CHECKOUT_SESSION_KEY); } catch { /* ignore */ }
        try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }

        if (eventSlug) {
          router.replace(`/${eventSlug}`);
          return;
        }
        router.back();
        return;
      }

      let orderId = rawOrderId;

      // Fallback to pendingPayment when the query param is missing.
      if (!orderId) {
        try {
          const raw = localStorage.getItem('pendingPayment');
          if (raw) {
            const parsed = JSON.parse(raw) as { orderId?: string };
            orderId = parsed.orderId || null;
          }
        } catch {
          // ignore
        }
      }

      if (!orderId) {
        setError('Missing payment information. Please go back and try again.');
        return;
      }

      // Refresh-safe resume: if we already initialized checkout recently for this order, reuse it.
      try {
        const rawSession = localStorage.getItem(CHECKOUT_SESSION_KEY);
        if (rawSession) {
          const session = JSON.parse(rawSession) as PendingCheckoutSession;
          const age = Date.now() - new Date(session.createdAt).getTime();
          if (session.orderId === orderId && session.authorizationUrl && age < CHECKOUT_SESSION_TTL_MS) {
            window.location.replace(session.authorizationUrl);
            return;
          }
        }
      } catch {
        // ignore
      }

      try {
        // Amount, currency and email come from the server-side order
        const authorizationUrl = await startPaystackCheckout(orderId);

        try {
          localStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify({
            orderId,
            authorizationUrl,
            createdAt: new Date().toISOString(),
          }));
        } catch {
          // non-critical
        }

        window.location.replace(authorizationUrl);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to start payment';
        setError(message);
      }
    };

    start();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-brand text-white rounded-xl">Go Back</button>
        </div>
      </div>
    );
  }

  return <PageSkeleton />;
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentContent />
    </Suspense>
  );
}
