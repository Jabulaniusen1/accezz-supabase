'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Receipt from "../components/Receipt"
import axios from "axios";
import { BASE_URL } from "../../../config";
import Loader from "@/components/ui/loader/Loader";

const SuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {

    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const ticketId = searchParams.get('ticketId');
      const status = searchParams.get('status');
    
      // Handle explicit failure cases
      if (status === 'failed' || status === 'cancelled') {
        router.push(`/payment-failed?ticketId=${ticketId}`);
        return;
      }
    
      // Handle pending payments
      if (status === 'pending') {
        router.push(`/payment-pending?ticketId=${ticketId}`);
        return;
      }
    
      try {
        if (reference) {
          const response = await axios.post(`${BASE_URL}api/v1/payment/verify`, { 
            reference
          });
    
          // Handle success (200/201) or already verified (400)
          if (response.status === 200 || response.status === 201 || response.status === 400) {
            setIsVerifying(false);
            router.push(`/success?reference=${reference}${ticketId ? `&ticketId=${ticketId}` : ''}`);
            return;
          }
          throw new Error('Payment not verified');
        } 
        else if (ticketId) {
          setIsVerifying(false);
          router.push(`/success?ticketId=${ticketId}`);
          return;
        }
        
        throw new Error('Missing reference or ticketId');
      } catch (error: unknown) {
        console.error('Payment error:', error);
        setIsVerifying(false);
        
        // Type-safe error handling
        if (axios.isAxiosError(error)) {
          // Handle Axios errors
          if (error.response?.status === 400) {
            router.push(`/success?reference=${reference}${ticketId ? `&ticketId=${ticketId}` : ''}`);
          } else {
            router.push(`/payment-failed${ticketId ? `?ticketId=${ticketId}` : ''}`);
          }
        } else if (error instanceof Error) {
          // Handle native Errors
          router.push(`/payment-failed${ticketId ? `?ticketId=${ticketId}` : ''}`);
        } else {
          // Handle unknown error types
          router.push(`/payment-failed${ticketId ? `?ticketId=${ticketId}` : ''}`);
        }
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
