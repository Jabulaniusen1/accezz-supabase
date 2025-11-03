'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Receipt from "../components/Receipt"
import Loader from "@/components/ui/loader/Loader";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { markOrderAsPaid, createTicketsForOrder } from "@/utils/paymentUtils";
import { supabase } from "@/utils/supabaseClient";
import { clearTicketPurchaseState } from "@/utils/localStorage";

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

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
          const p = JSON.parse(raw);
          if (p.eventSlug) {
            setEventSlug(p.eventSlug); // For modal usage
            storedEventSlug = p.eventSlug; // For immediate use
          }
        }
      } catch {}
    
      // Handle explicit failure cases
      if (status === 'cancelled') {
        // Clear localStorage
        try { localStorage.removeItem('pendingPayment'); } catch {}
        try { clearTicketPurchaseState(); } catch {}
        
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
              const eventId = order.event_id;
              if (eventId) {
                router.replace(`/${eventId}`);
                return;
              }
            }
          } catch {}
        }
        
        // Fallback: go back to previous page
        router.back();
        return;
      }
      if (status === 'failed') {
        try { localStorage.removeItem('pendingPayment'); } catch {}
        try { clearTicketPurchaseState(); } catch {}
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
        // If ticketId exists in URL, ticket is already created (free ticket or reload)
        if (urlTicketId) {
          setTicketId(urlTicketId);
          setIsVerifying(false);
          return;
        }

        // Verify via Paystack API
        if (reference) {
          const vRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
          const vData = await vRes.json();
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

          // Mark order as paid and issue tickets
          await markOrderAsPaid(resolvedOrderId, reference, 'paystack');
          await createTicketsForOrder(resolvedOrderId);

          // Get the first ticket ID
          const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select('id')
            .eq('order_id', resolvedOrderId)
            .limit(1);

          if (ticketsError || !tickets || tickets.length === 0) {
            throw new Error('Failed to retrieve tickets');
          }

          const firstTicketId = tickets[0].id;
          
          // Clear saved purchase state since payment is complete
          try { clearTicketPurchaseState(); } catch {}
          try { localStorage.removeItem('pendingPayment'); } catch {}
          
          // Store in state immediately and update URL (non-blocking navigation)
          setTicketId(firstTicketId);
          setIsVerifying(false);
          
          // Update URL for bookmarking/sharing (async, won't block render)
          window.history.replaceState({}, '', `/success?ticketId=${firstTicketId}`);
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

  // Sync ticketId from URL if we don't have it in state (e.g., on reload)
  useEffect(() => {
    const urlTicketId = searchParams.get('ticketId');
    if (urlTicketId && !ticketId && !isVerifying) {
      setTicketId(urlTicketId);
    }
  }, [searchParams, ticketId, isVerifying]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f54502] mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your ticket...</p>
        </div>
      </div>
    );
  }

  // If we have ticketId in state or URL, show receipt immediately (don't wait for URL update)
  const urlTicketId = searchParams.get('ticketId');
  const finalTicketId = ticketId || urlTicketId;
  
  if (!finalTicketId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f54502] mx-auto"></div>
          <p className="mt-4 text-gray-600">Finalizing your receipt...</p>
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
        {/* Ticket Display */}
        <div className="w-full max-w-4xl">
          <Receipt isModal={false} autoDownload={true} />
        </div>
      </div>
    </>
  );
};

const SuccessPage = () => {
  return (
    <Suspense fallback={<div><Loader/></div>}>
      <SuccessContent />
    </Suspense>
  );
};

export default SuccessPage;
