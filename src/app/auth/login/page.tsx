'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaRedo } from 'react-icons/fa';
import Loader from '../../../components/ui/loader/Loader';
import Toast from '../../../components/ui/Toast';
import Link from 'next/link';
import axios from 'axios';
import { BASE_URL } from '../../../../config';
import Image from 'next/image';

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
      const response = await axios.post(`${BASE_URL}api/v1/users/login`, formData);

      if (response.status === 200) {
        const { user, token } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('user', JSON.stringify(user));

        router.push('/dashboard');
      }
    } catch (error: unknown) {
      let message = 'Login failed. Please try again.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          message = 'Invalid email or password';
        } else if (error.response?.status === 400) {
          message = 'Please verify your email first';
          setShowVerificationNotice(true);
        } else if (error.response?.data?.message) {
          message = error.response.data.message;
        }
      } else if (error instanceof Error) {
        message = 'Network error. Please check your connection.';
      }
      
      showToastMessage('error', message);
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
      await axios.post(`${BASE_URL}api/v1/users/resend-otp`, {
        email: formData.email
      });
      showToastMessage('success', 'Verification email sent!');
      setShowVerificationNotice(false);
    } catch {
      showToastMessage('error', 'Failed to resend verification. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row-reverse bg-white">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        {/* Loading and Toast */}
        {loading && <Loader />}
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}

        {/* Form Content */}
        <div className="w-full max-w-md rounded-2xl animate-fadeIn p-6 sm:p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-black">Welcome Back</h1>
              <p className="text-gray-500">Log in to your account</p>
            </div>

            {/* VERIFICATION NOTICE */}
            {showVerificationNotice && (
              <div className="p-3 bg-[#f54502]/10 border border-[#f54502]/20 rounded-lg text-[#f54502] text-sm">
                <p>Please verify your email to continue.</p>
                <button 
                  onClick={resendVerification}
                  disabled={resendLoading}
                  className="mt-2 flex items-center text-sm text-[#f54502] hover:underline"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                  {resendLoading && <FaRedo className="ml-2 animate-spin" />}
                </button>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm text-gray-500">
                  Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f54502] text-black placeholder-[#f54502]/50"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm text-gray-500">
                  Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f54502] text-black placeholder-[#f54502]/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-200 hover:text-black transition-colors"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full px-5 py-3 flex items-center justify-center rounded-xl
                transition-all duration-300 
                ${
                  loading
                    ? "bg-gray-500/30 cursor-not-allowed"
                    : "bg-[#f54502] hover:bg-[#f54502]/90 text-white text-sm font-medium transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            <div className="text-center space-y-3">
              <Link
                href="/auth/forgot-password"
                className="block text-gray-500 hover:text-black text-sm"
              >
                Forgot password?
              </Link>
              <p className="text-gray-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-[#f54502] hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f54502]/20 to-[#d63a02]/20 dark:from-gray-900/40 dark:to-[#f54502]/40 z-10"></div>
        <Image
          src="/images/vtickets hero.jpg"
          alt="Event Management"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50 z-20"></div>
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="text-center text-gray-100 p-8">
            <h2 className="text-4xl font-bold mb-4">Welcome Back</h2>
            <p className="text-xl text-gray-300 max-w-md">
              Access your events and manage your tickets with ease
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}