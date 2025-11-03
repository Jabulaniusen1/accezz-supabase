'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '@/utils/supabaseClient';


function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/password-reset` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast.success('Password reset email sent. Check your inbox for the link.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email.';
      toast.error(message);
    } finally {
      setLoading(false);
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
        <ToastContainer />

        {/* Form Container */}
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#f54502] rounded-[5px] mb-3 sm:mb-4 shadow-lg">
              <svg className="w-5 h-5 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Reset Password</h1>
            <p className="text-gray-600 text-sm sm:text-lg">Enter your email to get a new password</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[5px] sm:rounded-xl shadow-2xl border border-white/20 p-4 sm:p-8 animate-fadeIn">
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative group">
                  <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-[#f54502] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 "
                    placeholder="Enter your email"
                  />    
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full px-4 sm:px-6 py-2.5 sm:py-4 flex items-center justify-center rounded-[5px] font-semibold text-sm sm:text-lg transition-all duration-300 transform
                ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white shadow-lg hover:shadow-xl hover:scale-105"
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="text-center mt-4 sm:mt-6">
              <p className="text-gray-600 text-xs sm:text-sm">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="text-[#f54502] hover:underline font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
}

export default ForgotPassword;
