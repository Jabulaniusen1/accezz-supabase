'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaRedo, FaArrowLeft } from 'react-icons/fa';
import Loader from '../../../components/ui/loader/Loader';
import Toast from '../../../components/ui/Toast';
import Link from 'next/link';
import { signInWithEmail, getSession } from '@/utils/supabaseAuth';

type FormData = {
  email: string;
  password: string;
};

type ToastType = 'success' | 'error' | 'warning' | 'info';

export default function Login() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: ToastType;
    message: string;
  }>({
    type: 'success',
    message: '',
  });
  const [resendLoading, setResendLoading] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const router = useRouter();

  // Check for verification param
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('verify') === 'true') {
        setShowVerificationNotice(true);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const showToastMessage = (type: ToastType, message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmail(formData.email, formData.password);
      // Back-compat: populate localStorage token/user so legacy guards don't redirect
      const session = await getSession();
      if (session) {
        localStorage.setItem('token', session.access_token);
        localStorage.setItem('userEmail', session.user.email || '');
        localStorage.setItem('user', JSON.stringify({
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name,
          id: session.user.id,
        }));
      }
      router.push('/dashboard');
    } catch (error: any) {
      const code = error?.status || error?.code;
      if (code === 'email_not_confirmed' || code === '400') {
        setShowVerificationNotice(true);
        showToastMessage('error', 'Please verify your email first');
      } else {
        showToastMessage('error', error?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!formData.email) {
      showToastMessage('warning', 'Please enter your email first');
      return;
    }

    setResendLoading(true);
    try {
      // Supabase automatically sends verification on sign up; for resend, prompt user to re-signup flow or use Admin
      showToastMessage('info', 'If you signed up, check your inbox for the verification email.');
      setShowVerificationNotice(false);
    } finally {
      setResendLoading(false);
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
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-[#f54502] transition-colors group"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Loading and Toast */}
        {loading && <Loader />}
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}

        {/* Form Container */}
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#f54502] rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600 text-lg">Sign in to continue your journey</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 animate-fadeIn">
            <div className="space-y-6">

              {/* VERIFICATION NOTICE */}
              {showVerificationNotice && (
                <div className="p-4 bg-gradient-to-r from-[#f54502]/10 to-[#f54502]/5 border border-[#f54502]/20 rounded-2xl text-[#f54502] text-sm">
                  <p className="font-medium">Please verify your email to continue.</p>
                  <button 
                    onClick={resendVerification}
                    disabled={resendLoading}
                    className="mt-2 flex items-center text-sm text-[#f54502] hover:underline font-medium"
                  >
                    {resendLoading ? 'Sending...' : 'Resend verification email'}
                    {resendLoading && <FaRedo className="ml-2 animate-spin" />}
                  </button>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative group">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f54502] transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-transparent text-gray-900 placeholder-gray-400 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f54502] transition-colors"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-6 py-4 flex items-center justify-center rounded-2xl font-semibold text-lg transition-all duration-300 transform
                  ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white shadow-lg hover:shadow-xl hover:scale-105"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Logging in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="text-center space-y-4">
                <Link
                  href="/auth/forgot-password"
                  className="block text-gray-600 hover:text-[#f54502] text-sm font-medium transition-colors"
                >
                  Forgot password?
                </Link>
                <p className="text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="text-[#f54502] hover:underline font-semibold transition-colors"
                  >
                    Create one now
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}