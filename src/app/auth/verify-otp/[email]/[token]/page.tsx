'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FaRedo, FaCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios, { AxiosError } from 'axios';
import Toast from '@/components/ui/Toast';
import { BASE_URL } from '../../../../../../config';

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

  // VERIFY TOKEN FUNCTION
  const verifyToken = useCallback(async () => {
    if (!token || !email) return;

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}api/v1/users/verify-otp`, {
        email,
        secret: token
      });

      if (response.data?.message) {
        setToastProps({
          type: 'success',
          message: response.data.message + ' Redirecting to login...'
        });
      } else {
        setToastProps({
          type: 'success',
          message: 'Email verified successfully! Redirecting to login...'
        });
      }
      setShowToast(true);

      // Store verification status
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        localStorage.setItem('user', JSON.stringify({
          ...user,
          emailVerified: true
        }));
      }

      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (error) {
      let errorMessage = 'Failed to verify email';
      
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data?.message || errorMessage;
      }
      
      setToastProps({
        type: 'error',
        message: errorMessage
      });
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [token, email, router]);

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
      await axios.post(`${BASE_URL}api/v1/users/resend-otp`, { email });

      setToastProps({
        type: 'success',
        message: 'New verification link sent! Please check your email.'
      });
      setShowToast(true);
      setResendCooldown(30);
    } catch (error) {
      let errorMessage = 'Failed to resend verification link';
      
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data?.message || errorMessage;
      }
      
      setToastProps({
        type: 'error',
        message: errorMessage
      });
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
        className="relative w-full max-w-md p-6 backdrop-blur-lg bg-white/10 rounded-2xl shadow-2xl border border-white/20"
      >
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-blue-100">
            We&apos;re verifying your email address ({email})
          </p>

          <div className="space-y-6 mt-8">
            {/* VERIFY BUTTON */}
            <button
              onClick={verifyToken}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 
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
              className="text-blue-100 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
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