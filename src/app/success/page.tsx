'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Invoice from "../components/Invoice"
import Loader from "@/components/ui/loader/Loader";
import PaymentFailedModal from "@/components/PaymentFailedModal";
import { processPaymentSuccess } from "@/utils/paymentUtils";
import { supabase } from "@/utils/supabaseClient";
import { clearTicketPurchaseState } from "@/utils/localStorage";
import CreateAccountPrompt from "../components/CreateAccountPrompt";
import { getSession } from "@/utils/supabaseAuth";

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
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
          
          // Check if we should show account prompt for reloaded page
          // Get order from ticket to check if user is logged in
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('order_id, orders!inner(buyer_email, buyer_user_id)')
            .eq('id', urlTicketId)
            .single();
          
          if (ticketData) {
            const order = (ticketData as { orders?: { buyer_email?: string | null; buyer_user_id?: string | null; order_id?: string | null } | null }).orders;
            const session = await getSession();
            if (!session && order && order.buyer_email && !order.buyer_user_id) {
              setOrderEmail(order.buyer_email || null);
              setOrderId(order.order_id || null);
              setShowAccountPrompt(true);
            }
          }
          
          setIsVerifying(false);
          return;
        }

        // Verify via Paystack API (fallback - webhook is primary)
        if (reference) {
          const resolvedOrderId = orderId || (await (async () => {
            // Try to get orderId from verification
            const vRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
            const vData = await vRes.json();
            if (!vRes.ok || !vData?.status) {
              throw new Error(vData?.error || 'Verification failed');
            }

            if (vData.status !== 'success') {
              setShowFailureModal(true);
              setIsVerifying(false);
              return null;
            }

            return vData.orderId;
          })());

          if (!resolvedOrderId) {
            throw new Error('Order not found from verification');
          }

          // Check if order is already paid (idempotency check)
          const { data: orderData, error: orderDataError } = await supabase
            .from('orders')
            .select('id, status, buyer_email, buyer_user_id')
            .eq('id', resolvedOrderId)
            .single();

          if (orderDataError) {
            console.error('Order fetch error:', orderDataError);
            throw new Error('Order not found');
          }

          // If already paid, just fetch tickets (webhook already processed it)
          if (orderData.status === 'paid') {
            console.log('[Success] Order already paid, fetching tickets');
            
            // Get the first ticket ID
            const { data: tickets, error: ticketsError } = await supabase
              .from('tickets')
              .select('id')
              .eq('order_id', resolvedOrderId)
              .limit(1);

            if (ticketsError || !tickets || tickets.length === 0) {
              // Tickets might still be generating, wait a bit and retry
              console.log('[Success] Tickets not found yet, waiting...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const { data: retryTickets } = await supabase
                .from('tickets')
                .select('id')
                .eq('order_id', resolvedOrderId)
                .limit(1);

              if (!retryTickets || retryTickets.length === 0) {
                throw new Error('Tickets not found. Please check your email or contact support.');
              }

              const firstTicketId = retryTickets[0].id;
              setTicketId(firstTicketId);
            } else {
              const firstTicketId = tickets[0].id;
              setTicketId(firstTicketId);
            }
          } else if (orderData.status === 'pending') {
            // Order is still pending - process payment as fallback (webhook might not have fired yet)
            console.log('[Success] Order still pending, processing payment as fallback');
            
            const result = await processPaymentSuccess(resolvedOrderId, reference, 'paystack');
            
            if (!result.success) {
              throw new Error(result.message || 'Payment processing failed');
            }

            // Wait a moment for tickets to be created
            await new Promise(resolve => setTimeout(resolve, 1000));

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
            setTicketId(firstTicketId);
          } else {
            // Order is failed/cancelled
            setShowFailureModal(true);
            setIsVerifying(false);
            return;
          }

          // Clear saved purchase state since payment is complete
          try { clearTicketPurchaseState(); } catch {}
          try { localStorage.removeItem('pendingPayment'); } catch {}
          
          // Store in state
          setOrderId(resolvedOrderId);
          
          // Check if user is logged in
          const session = await getSession();
          // Only show prompt if user is not logged in AND order doesn't already have a buyer_user_id
          if (!session && orderData && orderData.buyer_email && !orderData.buyer_user_id) {
            // User is not logged in, show account creation prompt
            setOrderEmail(orderData.buyer_email);
            setShowAccountPrompt(true);
          }
          
          setIsVerifying(false);
          
          // Update URL for bookmarking/sharing (async, won't block render)
          const finalTicketId = ticketId || (await (async () => {
            const { data: finalTickets } = await supabase
              .from('tickets')
              .select('id')
              .eq('order_id', resolvedOrderId)
              .limit(1);
            return finalTickets?.[0]?.id || null;
          })());
          
          if (finalTicketId) {
            setTicketId(finalTicketId);
            window.history.replaceState({}, '', `/success?ticketId=${finalTicketId}`);
          }
          return;
        }
        
        throw new Error('Missing reference, ticketId, or orderId');
      } catch (error: unknown) {
        console.error('Payment verification error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Before showing failure, check if payment actually succeeded by looking for tickets
        // This handles cases where verification fails but webhook already processed payment
        let paymentActuallySucceeded = false;
        
        if (reference || orderId) {
          try {
            // Try to get orderId from reference if we have it
            const checkOrderId = orderId || (await (async () => {
              if (reference) {
                try {
                  const vRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
                  const vData = await vRes.json();
                  if (vData?.orderId) {
                    return vData.orderId;
                  }
                } catch {
                  // Verification failed, but check by reference in orders table
                  const { data: orderByRef } = await supabase
                    .from('orders')
                    .select('id, status')
                    .eq('payment_reference', reference)
                    .limit(1);
                  
                  if (orderByRef && orderByRef.length > 0) {
                    return orderByRef[0].id;
                  }
                }
              }
              return null;
            })());
            
            if (checkOrderId) {
              // Check if order is paid
              const { data: orderCheck } = await supabase
                .from('orders')
                .select('id, status')
                .eq('id', checkOrderId)
                .single();
              
              if (orderCheck && orderCheck.status === 'paid') {
                // Order is paid - check for tickets
                const { data: tickets } = await supabase
                  .from('tickets')
                  .select('id')
                  .eq('order_id', checkOrderId)
                  .limit(1);
                
                if (tickets && tickets.length > 0) {
                  // Payment succeeded! Tickets exist
                  paymentActuallySucceeded = true;
                  setTicketId(tickets[0].id);
                  setOrderId(checkOrderId);
                  
                  // Clear saved purchase state
                  try { clearTicketPurchaseState(); } catch {}
                  try { localStorage.removeItem('pendingPayment'); } catch {}
                  
                  // Check if user is logged in for account prompt
                  const session = await getSession();
                  if (!session && orderCheck) {
                    const { data: orderData } = await supabase
                      .from('orders')
                      .select('buyer_email, buyer_user_id')
                      .eq('id', checkOrderId)
                      .single();
                    
                    if (orderData && orderData.buyer_email && !orderData.buyer_user_id) {
                      setOrderEmail(orderData.buyer_email);
                      setShowAccountPrompt(true);
                    }
                  }
                  
                  setIsVerifying(false);
                  return; // Don't show failure modal
                }
              }
            }
          } catch (checkError) {
            console.error('Error checking payment status:', checkError);
            // Continue to show failure modal if we can't verify
          }
        }
        
        // Only show failure modal if we're CERTAIN payment failed
        // (i.e., no tickets found and order is not paid)
        if (!paymentActuallySucceeded) {
          setShowFailureModal(true);
        }
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
      {showAccountPrompt && orderEmail && orderId && (
        <CreateAccountPrompt
          isOpen={showAccountPrompt}
          onClose={() => setShowAccountPrompt(false)}
          buyerEmail={orderEmail}
          orderId={orderId}
        />
      )}
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        {/* Invoice Display */}
        <div className="w-full">
          <Invoice ticketId={finalTicketId} orderId={orderId} />
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
