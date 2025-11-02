'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader from '@/components/ui/loader/Loader';

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
          body: JSON.stringify({ orderId, amount: Number(amount), email, currency: 'NGN' })
        });

        const raw = await res.text();
        let data: { authorization_url?: string; error?: string } | null = null;
        try { data = raw ? (JSON.parse(raw) as { authorization_url?: string; error?: string }) : null; } catch { data = null; }

        if (!res.ok) {
          const msg = data?.error || raw || 'Failed to start payment';
          throw new Error(msg);
        }
        if (!data?.authorization_url) {
          throw new Error('Invalid response from payment initializer');
        }
        
        // Set a flag to indicate we're redirecting to Paystack
        sessionStorage.setItem('paystack_redirected', 'true');
        
        window.location.href = data.authorization_url;
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

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader />
        <p className="text-gray-600 dark:text-gray-300">Redirecting to Paystack...</p>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader />
          <p className="text-gray-600 dark:text-gray-300">Loading payment...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}

