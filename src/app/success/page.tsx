'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { supabase } from "@/utils/supabaseClient";
import { clearTicketPurchaseState } from "@/utils/localStorage";
import CreateAccountPrompt from "../components/CreateAccountPrompt";
import { getSession } from "@/utils/supabaseAuth";

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [orderEmail, setOrderEmail] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const urlTicketId = searchParams.get('ticketId');
      const orderId = searchParams.get('orderId');
      const status = searchParams.get('status');
    
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
        try { clearTicketPurchaseState(); } catch { /* ignore */ }
        
        // Use stored event slug to redirect
        if (storedEventSlug) {
          router.replace(`/${storedEventSlug}`);
          return;
        }
        
        // Fallback: Use orderId from URL to get event and redirect
        if (orderId) {
          try {
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .select('event_id, events(slug)')
              .eq('id', orderId)
              .single();
            
            if (!orderError && order) {
              const slug = (order as { events?: { slug?: string | null } | null }).events?.slug || undefined;
              if (slug) {
                router.replace(`/${slug}`);
                return;
              }
              // Use event_id directly instead of assigning to unused variable
              if (order.event_id) {
                router.replace(`/${order.event_id}`);
                return;
              }
            }
          } catch (e) {
            console.error('Failed to fetch order for redirect:', e instanceof Error ? e.message : e);
          }
        }

        // Fallback: go back to previous page
        router.back();
        return;
      }
      if (status === 'failed') {
        try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
        try { clearTicketPurchaseState(); } catch { /* ignore */ }
        setShowFailureModal(true);
        setIsVerifying(false);
        return;
      }
    
      // Handle pending payments
      if (status === 'pending') {
        router.push(`/payment-pending${urlTicketId ? `?ticketId=${urlTicketId}` : ''}`);
        return;
      }
    
      try {
      // If ticketId exists in URL, redirect to invoice (for backward compatibility)
      if (urlTicketId) {
        // Get order from ticket
        const { data: ticketData } = await supabase
          .from('tickets')
          .select('order_id, orders!inner(buyer_email, buyer_user_id)')
          .eq('id', urlTicketId)
          .single();
        
        if (ticketData) {
          const order = (ticketData as { orders?: { buyer_email?: string | null; buyer_user_id?: string | null; order_id?: string | null } | null }).orders;
          const orderIdFromTicket = order?.order_id || null;
          
          if (orderIdFromTicket) {
            // Redirect to invoice page
            router.replace(`/invoice/${orderIdFromTicket}`);
            return;
          }
        }
        
        setIsVerifying(false);
        return;
      }

        // Verify via Paystack API
        if (reference) {
          const vRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
          const vData = await vRes.json() as { status?: string; error?: string; orderId?: string };
          if (!vRes.ok || !vData?.status) {
            throw new Error(vData?.error || 'Verification failed');
          }

          if (vData.status !== 'success') {
            setShowFailureModal(true);
            setIsVerifying(false);
            return;
          }

          const resolvedOrderId = vData.orderId || orderId;
          if (!resolvedOrderId) {
            throw new Error('Order not found from verification');
          }

          // Ticket creation, emails, and reminders are all handled by the Paystack webhook.
          // Poll briefly (up to ~8 s) so the invoice page sees the paid order.
          let orderData: { buyer_email: string | null; buyer_user_id: string | null; id: string; status: string } | null = null;
          for (let attempt = 0; attempt < 8; attempt++) {
            const { data } = await supabase
              .from('orders')
              .select('buyer_email, buyer_user_id, id, status')
              .eq('id', resolvedOrderId)
              .single();
            if (data?.status === 'paid') { orderData = data; break; }
            await new Promise(r => setTimeout(r, 1000));
          }
          // Fall back: read whatever is there even if webhook hasn't fired yet
          if (!orderData) {
            const { data } = await supabase
              .from('orders')
              .select('buyer_email, buyer_user_id, id, status')
              .eq('id', resolvedOrderId)
              .single();
            orderData = data;
          }

          try { clearTicketPurchaseState(); } catch { /* ignore */ }
          try { localStorage.removeItem('pendingPayment'); } catch { /* ignore */ }
          
          setOrderId(resolvedOrderId);
          
          // Check if user is logged in
          const session = await getSession();
          // Only show prompt if user is not logged in AND order doesn't already have a buyer_user_id
          if (!session && orderData && orderData.buyer_email && !orderData.buyer_user_id) {
            // User is not logged in, show account creation prompt
            setOrderEmail(orderData.buyer_email);
            setShowAccountPrompt(true);
            setIsVerifying(false);
            return;
          }
          
          setIsVerifying(false);
          
          // Redirect to invoice page
          router.replace(`/invoice/${resolvedOrderId}`);
          return;
        }
        
        throw new Error('Missing reference, ticketId, or orderId');
      } catch (error: unknown) {
        console.error('Payment verification error:', error);
        setShowFailureModal(true);
        setIsVerifying(false);
      }
    }; 

    verifyPayment();
  }, [searchParams, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f54502] mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
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
            // Redirect to event details
            if (eventSlug) {
              router.replace(`/${eventSlug}`);
              return;
            }
            // Fallback: go back to previous page
            router.back();
          }}
          onTryAgain={async () => {
            setShowFailureModal(false);
            // Redirect to event details
            if (eventSlug) {
              router.replace(`/${eventSlug}`);
              return;
            }
            // Fallback: go back to previous page
            router.back();
          }}
        />
      )}
      {showAccountPrompt && orderEmail && orderId && (
        <CreateAccountPrompt
          isOpen={showAccountPrompt}
          onClose={() => {
            setShowAccountPrompt(false);
            // Redirect to invoice after closing prompt
            if (orderId) {
              router.replace(`/invoice/${orderId}`);
            }
          }}
          buyerEmail={orderEmail}
          orderId={orderId}
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
