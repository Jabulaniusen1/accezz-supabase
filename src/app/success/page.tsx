'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Receipt from "../components/Receipt"
import axios from "axios";
import { BASE_URL, TELEGRAM_URL, WHATSAPP_URL } from "../../../config";
import Loader from "@/components/ui/loader/Loader";
import SocialChannelsCTA from "@/components/SocialChannelsCTA";

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

  const closeReceipt = () => {
    // Receipt will close and redirect to home
    router.push("/");
  };  

  const handleDashboardRedirect = () => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/auth/signup?redirect=/dashboard");
    }
  };

  const handleHomeRedirect = () => {
    router.push("/");
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your ticket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-700 via-purple-700 to-purple-900 px-2 sm:px-4 py-10 overflow-hidden">
      {/* Floating Blobs */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-60" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-60" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-2xl opacity-60" />
      </div>

      {/* Success Icon */}
      <div className="bg-white p-8 rounded-full shadow-2xl z-10 border-4 border-green-200">
        <svg
          className="sm:w-24 sm:h-24 w-[4.5rem] h-[4.5rem] text-green-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Heading */}
      <h1 className="text-white text-4xl sm:text-6xl font-extrabold mt-6 sm:mt-10 text-center z-10 drop-shadow-lg" style={{ letterSpacing: '0.03em' }}>
        Payment Successful! 🎉
      </h1>

      {/* Message */}
      <p className="text-white/90 text-base sm:text-xl mt-6 text-center max-w-2xl px-6 z-10 font-medium" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
        Your ticket purchase was successful! A confirmation email with your QR code has been sent to your email address. Please remember to save it – you&apos;ll need it to gain entry to the event.
      </p>

      {/* Screenshot Message */}
      <div className="mt-8 bg-yellow-500/20 backdrop-blur-lg rounded-xl p-6 max-w-2xl mx-4 z-10 border border-yellow-300/30 shadow-lg">
        <div className="flex items-center space-x-2 mb-2">
          <svg
            className="w-6 h-6 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-yellow-300 font-bold text-lg">Take a screenshot of your ticket now!</span>
        </div>
        <p className="text-white/90 text-base">
          Your ticket is displayed below. Please take a screenshot and save it to your device. This is your official entry pass and will be required for verification at the event venue.
        </p>
      </div>

      {/* Buttons */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl px-4 z-10">
        <button
          onClick={handleDashboardRedirect}
          className="backdrop-blur-md bg-gradient-to-r from-yellow-400/60 to-yellow-500/40 border border-yellow-400/30 text-white text-lg font-semibold px-6 py-3 rounded-xl 
          shadow-[0_4px_16px_rgba(255,200,0,0.18)] transition-all duration-300 
          hover:bg-yellow-500/80 hover:shadow-[0_8px_24px_rgba(255,200,0,0.28)] 
          hover:scale-[1.03] hover:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/40 w-full"
        >
          Create Your Own Event
        </button>
        <button
          onClick={handleHomeRedirect}
          className="backdrop-blur-md bg-gradient-to-r from-white/20 to-white/10 border border-white/30 text-white text-lg font-semibold px-6 py-3 rounded-xl 
          shadow-[0_4px_16px_rgba(255,255,255,0.13)] transition-all duration-300 
          hover:bg-white/30 hover:shadow-[0_8px_24px_rgba(255,255,255,0.18)] 
          hover:scale-[1.03] hover:border-white/50 focus:ring-2 focus:ring-white/40 w-full"
        >
          Go Home
        </button>
      </div>

      {/* Social Channels CTA */}
      <div className="w-full max-w-2xl mt-12 px-4 z-10">
        <SocialChannelsCTA
          telegramUrl={TELEGRAM_URL}
          whatsappUrl={WHATSAPP_URL}
          variant="success"
        />
      </div>

      {/* Receipt Modal - Always visible */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <Receipt closeReceipt={closeReceipt} />
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
