'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Receipt from "../components/Receipt"
import Loader from "@/components/ui/loader/Loader";
import { markOrderAsPaid, createTicketsForOrder } from "@/utils/paymentUtils";
import { supabase } from "@/utils/supabaseClient";

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const ticketId = searchParams.get('ticketId');
      const orderId = searchParams.get('orderId');
      const status = searchParams.get('status');
    
      // Handle explicit failure cases
      if (status === 'failed' || status === 'cancelled') {
        router.push(`/payment-failed${ticketId ? `?ticketId=${ticketId}` : ''}`);
        return;
      }
    
      // Handle pending payments
      if (status === 'pending') {
        router.push(`/payment-pending${ticketId ? `?ticketId=${ticketId}` : ''}`);
        return;
      }
    
      try {
        // If ticketId exists, ticket is already created (free ticket)
        if (ticketId) {
          setIsVerifying(false);
          return;
        }

        // Verify payment with order ID
        if (orderId && reference) {
          // Mark order as paid
          await markOrderAsPaid(orderId, reference, 'paystack');
          
          // Create tickets for the order
          await createTicketsForOrder(orderId);

          // Get the first ticket ID for redirect
          const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select('id')
            .eq('order_id', orderId)
            .limit(1);

          if (ticketsError || !tickets || tickets.length === 0) {
            throw new Error('Failed to retrieve tickets');
          }

          setIsVerifying(false);
          router.push(`/success?ticketId=${tickets[0].id}`);
          return;
        }

        // If only reference exists (legacy flow), try to find order by reference
        if (reference) {
          const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('id')
            .eq('payment_reference', reference)
            .limit(1);

          if (orderError || !orders || orders.length === 0) {
            throw new Error('Order not found');
          }

          const foundOrderId = orders[0].id;
          
          // Mark as paid if not already
          const { data: order } = await supabase
            .from('orders')
            .select('status')
            .eq('id', foundOrderId)
            .single();

          if (order?.status !== 'paid') {
            await markOrderAsPaid(foundOrderId, reference, 'paystack');
            await createTicketsForOrder(foundOrderId);
          }

          // Get ticket ID
          const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select('id')
            .eq('order_id', foundOrderId)
            .limit(1);

          if (ticketsError || !tickets || tickets.length === 0) {
            throw new Error('Failed to retrieve tickets');
          }

          setIsVerifying(false);
          router.push(`/success?ticketId=${tickets[0].id}`);
          return;
        }
        
        throw new Error('Missing reference, ticketId, or orderId');
      } catch (error: unknown) {
        console.error('Payment verification error:', error);
        setIsVerifying(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Payment verification failed';
        
        // Redirect to failure page
        router.push(`/payment-failed${ticketId ? `?ticketId=${ticketId}` : ''}`);
      }
    };

    verifyPayment();
  }, [searchParams, router]);



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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Ticket Display */}
      <div className="w-full max-w-4xl">
        <Receipt isModal={false} />
      </div>
    </div>
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
