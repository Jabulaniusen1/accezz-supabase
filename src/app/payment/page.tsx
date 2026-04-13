'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageSkeleton } from '@/components/ui/Skeleton';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');
      const email = searchParams.get('email');
      const status = searchParams.get('status');
      const reference = searchParams.get('reference');

      // If Paystack redirected back with cancelled/failed status, redirect to event
      if (status === 'cancelled' || status === 'failed') {
        // Get event slug before clearing localStorage
        let eventSlug: string | null = null;
        try {
          const raw = localStorage.getItem('pendingPayment');
          if (raw) {
            const p = JSON.parse(raw);
            eventSlug = p.eventSlug || null;
          } 
        } catch {}
        // Clear localStorage
        try { localStorage.removeItem('pendingPayment'); } catch {}
        // Redirect to event details page using stored event slug
        if (eventSlug) {
          router.replace(`/${eventSlug}`);
          return;
        }
        // Fallback to browser back if no event slug found
        router.back();
        return;
      }

      // If this is a return from Paystack with reference but no status (cancelled payment)
      // Paystack doesn't send status when cancelled, just redirects back
      const wasRedirectedBack = sessionStorage.getItem('paystack_redirected');
      if (wasRedirectedBack && !reference && orderId) {
        // Get event slug before clearing localStorage
        let eventSlug: string | null = null;
        try {
          const raw = localStorage.getItem('pendingPayment');
          if (raw) {
            const p = JSON.parse(raw);
            eventSlug = p.eventSlug || null;
          }
        } catch {}
        // Clear the flag and localStorage
        sessionStorage.removeItem('paystack_redirected');
        try { localStorage.removeItem('pendingPayment'); } catch {}
        // Redirect to event details
        if (eventSlug) {
          router.replace(`/${eventSlug}`);
          return;
        }
        router.back();
        return;
      }

      if (!orderId || !amount || !email) {
        // try localStorage fallback
        try {
          const raw = localStorage.getItem('pendingPayment');
          if (raw) {
            const p = JSON.parse(raw);
            if (!orderId && p.orderId) {
              router.replace(`/payment?orderId=${p.orderId}&amount=${p.amount}&email=${encodeURIComponent(p.email)}`);
              return;
            }
          }
        } catch {}
        setError('Missing payment information. Please go back and try again.');
        return;
      }

      try {
        const res = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId, 
            amount: Number(amount), 
            email, 
            currency: 'NGN',
            callbackUrl: `${window.location.origin}/success?orderId=${orderId}`
          })
        });

        const raw = await res.text();
        let data: { authorization_url?: string; access_code?: string; reference?: string; error?: string } | null = null;
        try { data = raw ? (JSON.parse(raw) as { authorization_url?: string; access_code?: string; reference?: string; error?: string }) : null; } catch { data = null; }

        if (!res.ok) {
          const msg = data?.error || raw || 'Failed to start payment';
          throw new Error(msg);
        }
        if (!data?.authorization_url) {
          throw new Error('Invalid response from payment initializer');
        }

        // Load Paystack inline JS SDK dynamically
        const loadPaystackScript = (): Promise<void> => {
          return new Promise((resolve, reject) => {
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
          amount: Math.round(Number(amount) * 100),
          currency: 'NGN',
          ref: data.reference || `ORD-${orderId}-${Date.now()}`,
          callback: (response: { reference: string; status: string }) => {
            // Note: callback must be synchronous, so we handle async operations inside
            (async () => {
              try {
                const verifyRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(response.reference)}`);
                const verifyData = await verifyRes.json() as { status?: string; orderId?: string; error?: string };
                
                if (verifyRes.ok && verifyData.status === 'success' && verifyData.orderId) {
                  const { markOrderAsPaid, createTicketsForOrder } = await import('@/utils/paymentUtils');
                  await markOrderAsPaid(verifyData.orderId, response.reference, 'paystack');
                  await createTicketsForOrder(verifyData.orderId);
                  
                  // Redirect to invoice page
                  router.replace(`/invoice/${verifyData.orderId}`);
                } else {
                  throw new Error(verifyData.error || 'Payment verification failed');
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                setError('Payment verification failed. Please contact support.');
              }
            })();
          },
          onClose: () => {
            setError('Payment cancelled');
          }
        });

        handler.openIframe();
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
          <button onClick={() => router.back()} className="px-4 py-2 bg-[#f54502] text-white rounded-xl">Go Back</button>
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


