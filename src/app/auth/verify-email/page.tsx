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
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 p-4">
      {/* Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md p-6 sm:p-8 sm:backdrop-blur-lg bg-white/10 rounded-2xl shadow-2xl border border-white/20 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/20 p-4 rounded-full">
            <FaEnvelope className="text-white text-3xl" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Check Your Email</h1>
        <p className="text-blue-100 mb-6">
          We&apos;ve sent a verification link to <span className="font-semibold text-white">{email}</span>.
          Please click the link in the email to verify your account.
        </p>

        <div className="space-y-4">
          <p className="text-blue-100">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button 
              onClick={resendOtp}
              className="text-white underline hover:text-blue-300"
            >
              resend verification
            </button>
          </p>

          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white hover:text-blue-300 transition-colors"
          >
            Go to Login <FaArrowRight />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default VerifyEmail;