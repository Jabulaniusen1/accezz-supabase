'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Lock, Eye, EyeOff, Phone, ArrowLeft, Globe, MapPin } from 'lucide-react';
import Toast from '../../../components/ui/Toast';
import { signUpWithEmail } from '@/utils/supabaseAuth';
import { useCountryCityOptions } from '@/hooks/useCountryCityOptions';
import SearchableSelect from '../../components/SearchableSelect';
import Link from 'next/link';
import Image from 'next/image';

const AgreeTerms = React.lazy(() => import('../../components/home/agreeTerms'));

type ToastType = 'success' | 'error' | 'warning' | 'info';

function SignupContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [accountType, setAccountType] = useState<'creator' | 'customer'>('customer');
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria');
  const [selectedCity, setSelectedCity] = useState<string>('Uyo, Akwa Ibom state');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { countries, getCitiesForCountry, isLoading: isLoadingLocations } = useCountryCityOptions();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: ToastType; message: string }>({ type: 'success', message: '' });

  const toast = (type: ToastType, message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam && typeof window !== 'undefined') {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      if (emailInput) emailInput.value = emailParam;
    }
  }, [searchParams]);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_name && countries.some(c => c.label === data.country_name)) {
          setSelectedCountry(data.country_name);
        }
      } catch {
        setSelectedCountry('Nigeria');
      }
    };
    if (countries.length > 0) detectCountry();
  }, [countries]);

  useEffect(() => {
    const cities = getCitiesForCountry(selectedCountry);
    if (selectedCountry === 'Nigeria') {
      setSelectedCity('Uyo, Akwa Ibom state');
    } else if (cities.length > 0) {
      setSelectedCity(cities[0]);
    } else {
      setSelectedCity('');
    }
  }, [selectedCountry, getCitiesForCountry]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const firstName = formData.get('firstName')?.toString().trim() || '';
      const lastName = formData.get('lastName')?.toString().trim() || '';
      const email = formData.get('email')?.toString().trim() || '';
      const phone = formData.get('phone')?.toString().trim() || '';
      const password = formData.get('password')?.toString().trim() || '';

      if (!firstName || !lastName || !email || !phone || !password || !selectedCountry || !selectedCity) {
        toast('warning', 'All fields are required.');
        return;
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        toast('warning', 'Invalid email address.');
        return;
      }

      await signUpWithEmail({
        email, password,
        fullName: `${firstName} ${lastName}`,
        phone, userType: accountType,
        country: selectedCountry, city: selectedCity,
      });

      const orderId = searchParams.get('orderId');
      if (orderId) localStorage.setItem('pendingOrderLink', orderId);

      try {
        await fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName: `${firstName} ${lastName}` }),
        });
      } catch {}

      toast('success', 'Account created! Please check your email to verify.');
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      setTimeout(() => {
        router.push(`/auth/login?verify=true&email=${encodeURIComponent(email)}${orderId ? `&orderId=${orderId}` : ''}${redirectUrl !== '/dashboard' ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`);
      }, 1200);
    } catch (error: unknown) {
      toast('error', error instanceof Error ? error.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cities = getCitiesForCountry(selectedCountry);
  const countryOptions = countries.map(c => ({ value: c.label, label: c.label }));
  const cityOptions = selectedCountry === 'Nigeria'
    ? [
        { value: 'Uyo, Akwa Ibom state', label: 'Uyo, Akwa Ibom state' },
        ...cities.filter(city => city.toLowerCase().trim() !== 'uyo').map(city => ({ value: city, label: city })),
      ]
    : cities.map(city => ({ value: city, label: city }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {showToast && <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />}
      {showTermsPopup && (
        <React.Suspense fallback={<div className="text-black">Loading terms...</div>}>
          <AgreeTerms onClose={() => setShowTermsPopup(false)} />
        </React.Suspense>
      )}

      {/* ── Left brand panel (md+) ── */}
      <div className="hidden md:flex md:w-[45%] lg:w-[40%] bg-[#f54502] flex-col justify-between p-10 sticky top-0 h-screen">
        <div>
          <div className="w-28 h-12 relative">
            <Image src="/accezz logo c.png" alt="Accezz" fill className="object-contain object-left brightness-0 invert" />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Start your journey<br />with Accezz
            </h2>
            <p className="text-white/70 mt-3 text-sm leading-relaxed">
              Create events, sell tickets, and connect with audiences — all in one place.
            </p>
          </div>
          <div className="space-y-3">
            {[
              'Create and manage events effortlessly',
              'Earn commissions through affiliate links',
              'Instant payouts to your wallet',
            ].map(item => (
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
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Back link */}
        <div className="px-6 py-5 flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-start justify-center px-6 py-6">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="md:hidden mb-8 flex justify-center">
              <div className="w-24 h-10 relative">
                <Image src="/accezz logo c.png" alt="Accezz" fill className="object-contain" />
              </div>
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Join thousands of event-goers and creators</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    First name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="Nkechi"
                      required
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 focus:border-[#f54502] transition"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Last name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      placeholder="Adesina"
                      required
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 focus:border-[#f54502] transition"
                    />
                  </div>
                </div>
              </div>

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
                    name="email"
                    placeholder="you@example.com"
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 focus:border-[#f54502] transition"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+234 701 000 000"
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f54502]/40 focus:border-[#f54502] transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
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

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Country
                </label>
                <SearchableSelect
                  options={countryOptions}
                  value={selectedCountry}
                  onChange={value => setSelectedCountry(value)}
                  placeholder="Select country..."
                  disabled={isLoadingLocations}
                  icon={<Globe className="w-4 h-4" />}
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  City
                </label>
                <SearchableSelect
                  options={cityOptions}
                  value={selectedCity}
                  onChange={value => setSelectedCity(value)}
                  placeholder="Select city..."
                  disabled={isLoadingLocations || cityOptions.length === 0}
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>

              {/* Account type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Account type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['customer', 'creator'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      className={`py-2.5 rounded-lg border-2 text-left px-3 transition ${
                        accountType === type
                          ? 'border-[#f54502] bg-[#f54502]/5 dark:bg-[#f54502]/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`text-sm font-medium ${accountType === type ? 'text-[#f54502]' : 'text-gray-700 dark:text-gray-300'}`}>
                        {type === 'customer' ? 'Customer' : 'Creator'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {type === 'customer' ? 'Buy tickets' : 'Create events'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#f54502] border-gray-300 rounded focus:ring-[#f54502] focus:ring-2 flex-shrink-0"
                />
                <label htmlFor="agreeTerms" className="text-sm text-gray-600 dark:text-gray-400">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsPopup(true)}
                    className="text-[#f54502] hover:underline font-medium"
                  >
                    Terms and Conditions
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={!agreeTerms || loading || isLoadingLocations}
                className="w-full h-10 bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || isLoadingLocations ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {loading ? 'Creating account…' : 'Loading locations…'}
                  </>
                ) : 'Create account'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400 pb-6">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#f54502] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}
