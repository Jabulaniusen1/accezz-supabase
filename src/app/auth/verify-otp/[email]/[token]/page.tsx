'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FaRedo, FaCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Toast from '@/components/ui/Toast';
import { supabase } from '@/utils/supabaseClient';

type ToastData = {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

export default function VerifyOTP() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<ToastData>({
    type: 'info',
    message: '',
  });

  // GET EMAIL AND TOKEN FROM URL
  const email = decodeURIComponent(params?.email as string);
  const token = params?.token as string;

  // VERIFY FUNCTION (Supabase verifies via magic link)
  const verifyToken = useCallback(async () => {
    setLoading(true);
    try {
      setToastProps({ type: 'success', message: 'Check your inbox and click the verification link.' });
      setShowToast(true);
      setTimeout(() => router.push('/auth/login'), 1200);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // AUTO-VERIFY ON MOUNT
  useEffect(() => {
    if (token && email) {
      verifyToken();
    }
  }, [token, email, verifyToken]);

  // RESEND OTP FUNCTION
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !email) return;

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;

      setToastProps({
        type: 'success',
        message: 'New verification link sent! Please check your email.'
      });
      setShowToast(true);
      setResendCooldown(30);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification link';
      setToastProps({ type: 'error', message });
      setShowToast(true);
    } finally {
      setResendLoading(false);
    }
  };

  // COOLDOWN TIMER
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 p-4">
      {/* BACKGROUND ANIMATION */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      </div>

      {/* MAIN CONTENT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md p-4 sm:p-6 backdrop-blur-lg bg-white/10 rounded-[5px] shadow-2xl border border-white/20"
      >
        <div className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-blue-100 text-xs sm:text-sm">
            We&apos;re verifying your email address ({email})
          </p>

          <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
            {/* VERIFY BUTTON */}
            <button
              onClick={verifyToken}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-[5px] font-medium transition-all duration-300 text-sm sm:text-base
                ${loading ? 'bg-gray-500/30 cursor-not-allowed' : 'bg-blue-500/30 hover:bg-blue-500/50'}`}
            >
              {loading ? (
                'Verifying...'
              ) : (
                <>
                  <FaCheck /> Verify Email
                </>
              )}
            </button>

            {/* RESEND BUTTON */}
            <button
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
              className="text-blue-100 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50 text-xs sm:text-sm"
            >
              <FaRedo className={resendLoading ? 'animate-spin' : ''} />
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Verification Link'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}