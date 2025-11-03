'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/navigation'
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';


function PasswordReset() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();  
  const [error, setError] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password reset successful! You can now log in.");
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred. Please try again later.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-gray-800 px-4 py-8"
    style={{
        backgroundImage: `url("/bg-back.avif")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <ToastContainer />
      <div className="max-w-md w-full bg-white rounded-[5px] shadow-lg p-4 sm:p-8 space-y-4 sm:space-y-6"
        style={{
            boxShadow: '3px -2px 3px 4px rgba(1,1,1,.2)'
        }}
      >
        <div className="text-center">
          <Image
            src="/accezz logo.png"
            alt="Accezz Logo"
            width={120}
            height={120}
            className="mx-auto mb-3 sm:mb-4 w-20 h-20 sm:w-[120px] sm:h-[120px]"
          />
          <h1 className="text-xl sm:text-3xl font-semibold text-gray-900">Reset Your Password</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-xs sm:text-sm">Enter your new password below.</p>
        </div>
{/* 
        {message && (
          <div className="text-green-600 text-center mb-4">
            <p>{message}</p>
          </div>
        )} */}

        {error && (
          <div className="text-red-600 text-center mb-3 sm:mb-4 text-xs sm:text-sm">
            <p>{error}</p>
          </div>
        )}

        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 sm:mt-2 w-full px-3 sm:px-4 py-2 border rounded-[5px] focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm sm:text-base"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 sm:mt-2 w-full px-3 sm:px-4 py-2 border rounded-[5px] focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm sm:text-base"
              placeholder="Confirm your password"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 sm:py-2.5 rounded-[5px] text-sm sm:text-base text-white ${loading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            Remembered your password?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PasswordReset;