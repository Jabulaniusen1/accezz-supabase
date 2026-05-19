'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, RotateCcw } from 'lucide-react';
import Toast from '../../../components/ui/Toast';
import Link from 'next/link';
import Image from 'next/image';
import { signInWithEmail, getSession } from '@/utils/supabaseAuth';
import { supabase } from '@/utils/supabaseClient';

type FormData = { email: string; password: string };
type ToastType = 'success' | 'error' | 'warning' | 'info';

function LoginContent() {
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: ToastType; message: string }>({ type: 'success', message: '' });
  const [resendLoading, setResendLoading] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const emailParam = searchParams.get('email');
      if (emailParam) setFormData(prev => ({ ...prev, email: emailParam }));
      if (searchParams.get('verify') === 'true') setShowVerificationNotice(true);
    }
  }, [searchParams]);

  const linkOrderToUser = async (userId: string, orderId: string) => {
    try {
      await supabase.from('orders').update({ buyer_user_id: userId }).eq('id', orderId).is('buyer_user_id', null);
    } catch {}
  };

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
      const session = await getSession();
      if (session) {
        const orderId = searchParams.get('orderId') || (typeof window !== 'undefined' ? localStorage.getItem('pendingOrderLink') : null);
        if (orderId) {
          await linkOrderToUser(session.user.id, orderId);
          if (typeof window !== 'undefined') localStorage.removeItem('pendingOrderLink');
        }
      }
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } catch (error: unknown) {
      const err = error as { status?: number; code?: string; message?: string };
      const code = err?.status || err?.code;
      if (code === 'email_not_confirmed' || code === '400') {
        setShowVerificationNotice(true);
        showToastMessage('error', 'Please verify your email first');
      } else {
        showToastMessage('error', err?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!formData.email) { showToastMessage('warning', 'Please enter your email first'); return; }
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: formData.email });
      if (error) throw error;
      showToastMessage('success', 'Verification email sent! Check your inbox.');
      setShowVerificationNotice(false);
    } catch (error: unknown) {
      showToastMessage('error', error instanceof Error ? error.message : 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {showToast && <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />}

      {/* ── Left brand panel (md+) ── */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] bg-[#f54502] flex-col justify-between p-10">
        <div>
          <div className="w-28 h-12 relative">
            <Image src="/accezz logo c.png" alt="Accezz" fill className="object-contain object-left brightness-0 invert" />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Your gateway to<br />unforgettable events
            </h2>
            <p className="text-white/70 mt-3 text-sm leading-relaxed">
              Buy tickets, discover events, and manage everything from one place.
            </p>
          </div>
          <div className="space-y-3">
            {['Instant ticket delivery to your email', 'QR code entry — no printing needed', 'Find events near you'].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} Accezz. All rights reserved.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col">
        {/* Back link */}
        <div className="px-6 py-5 flex items-center">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="md:hidden mb-8 flex justify-center">
              <div className="w-24 h-10 relative">
                <Image src="/accezz logo c.png" alt="Accezz" fill className="object-contain" />
              </div>
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
            </div>

            {/* Verification notice */}
            {showVerificationNotice && (
              <div className="mb-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">Email not verified</p>
                <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">Please check your inbox for a verification link.</p>
                <button
                  onClick={resendVerification}
                  disabled={resendLoading}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-400 hover:underline disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 focus:border-[#f54502] transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-xs text-[#f54502] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full h-10 pl-9 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 focus:border-[#f54502] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-[#f54502] font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
