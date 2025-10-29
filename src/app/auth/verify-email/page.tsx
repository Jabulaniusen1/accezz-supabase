'use client';
import React from 'react';
import { FaEnvelope, FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import { BASE_URL } from '../../../../config';
import Toast from '@/components/ui/Toast';

function VerifyEmail() {
  const email = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : '';

  // RESEND OTP 
  const resendOtp = async () => {
    try {
      const response = await axios.post(`${BASE_URL}api/v1/users/resend-otp`, {
        email
      });

      // Handle success response
      console.log('Resend OTP response:', response.data);
      // alert('Verification email resent successfully!');
    } catch (error) {
      // Handle error response
      console.error('Error resending OTP:', error);
      Toast({ message: 'Failed to resend verification email. Please try again.', type: 'error', onClose: () => {} });
    }
   
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#f54502]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8">
        {/* Form Container */}
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#f54502] rounded-2xl mb-4 shadow-lg">
              <FaEnvelope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 text-lg">We&apos;ve sent you a verification link</p>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 animate-fadeIn text-center"
          >
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-[#f54502]/10 to-[#f54502]/5 border border-[#f54502]/20 rounded-2xl">
                <p className="text-gray-700 text-sm">
                  We&apos;ve sent a verification link to{' '}
                  <span className="font-semibold text-[#f54502]">{email}</span>.
                  Please click the link in the email to verify your account.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={resendOtp}
                    className="text-[#f54502] underline hover:text-[#f54502]/80 font-medium"
                  >
                    resend verification
                  </button>
                </p>

                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white rounded-2xl font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Go to Login <FaArrowRight />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;