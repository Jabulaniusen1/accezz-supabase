'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader from '@/components/ui/loader/Loader';

// Declare PaystackPop type
declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        currency?: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');
        const email = searchParams.get('email');

        if (!orderId || !amount || !email) {
          // Try localStorage fallback
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
          setIsLoading(false);
          return;
        }

        // Load Paystack inline script
        const scriptLoaded = await loadPaystackScript();
        if (!scriptLoaded) {
          setError('Failed to load payment provider. Please try again.');
          setIsLoading(false);
          return;
        }

        // Initialize payment with backend
        const res = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, amount: Number(amount), email, currency: 'NGN' })
        });

        const raw = await res.text();
        let data: { access_code?: string; reference?: string; error?: string } | null = null;
        try { 
          data = raw ? (JSON.parse(raw) as { access_code?: string; reference?: string; error?: string }) : null; 
        } catch { 
          data = null; 
        }

        if (!res.ok) {
          const msg = data?.error || raw || 'Failed to start payment';
          throw new Error(msg);
        }

        if (!data?.access_code) {
          throw new Error('Invalid response from payment initializer');
        }

        // Get public key from environment (it's safe to use on client)
        const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error('Paystack public key not configured');
        }

        setIsLoading(false);

        // Capture values for callbacks (ensure they're in scope)
        const orderIdForCallback = orderId;
        const referenceForCallback = data.reference || `ORD-${orderId}-${Date.now()}`;
        const emailForCallback = email;

        // Define callback functions separately to ensure they're valid function references
        const paymentCallback = function(response: { reference: string }) {
          // Payment successful - redirect to success page
          setIsProcessing(true);
          router.push(`/success?reference=${response.reference}&orderId=${orderIdForCallback}`);
        };

        const paymentOnClose = function() {
          // User closed the popup - go back to event
          setIsLoading(false);
          try {
            const raw = localStorage.getItem('pendingPayment');
            if (raw) {
              const p = JSON.parse(raw);
              if (p.eventSlug) {
                router.replace(`/${p.eventSlug}`);
                return;
              }
            }
          } catch {}
          router.back();
        };

        // Verify PaystackPop is available
        if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') {
          throw new Error('Paystack payment library not loaded properly');
        }

        // Open Paystack inline popup
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: emailForCallback,
          amount: Math.round(Number(amount) * 100), // Amount in kobo
          ref: referenceForCallback,
          currency: 'NGN',
          callback: paymentCallback,
          onClose: paymentOnClose,
        });

        if (handler) {
          handler.openIframe();
        } else {
          throw new Error('Failed to initialize payment popup');
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to start payment';
        setError(message);
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [searchParams, router]);

  // Function to load Paystack script
  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.PaystackPop) {
        resolve(true);
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="paystack"]');
      if (existingScript) {
        // Wait a bit for it to load
        const checkInterval = setInterval(() => {
          if (window.PaystackPop) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
        return;
      }

      // Load the script
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        // Give it a moment to initialize
        setTimeout(() => {
          resolve(!!window.PaystackPop);
        }, 100);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  if (isProcessing) {
    return 
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => router.back()} 
            className="px-4 py-2 bg-[#f54502] text-white rounded-xl hover:bg-[#d63a02] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return 
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader />
        <p className="text-gray-600 dark:text-gray-300">Preparing payment...</p>
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
