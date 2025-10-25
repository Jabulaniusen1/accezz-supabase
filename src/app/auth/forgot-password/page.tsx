'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios, { AxiosError } from 'axios';
import { BASE_URL } from '../../../../config';


function ForgotPassword() {
  const router = useRouter();
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
      const response = await axios.patch(
      `${BASE_URL}api/v1/users/password-recovery`,
      { email },
      { headers: { 'Content-Type': 'application/json' } }
      );

      const generatedPassword = response.data.password;
      
      // Show success message with password
      toast.success(
      <div>
        <p>Temporary password generated!</p>
        <div className="mt-2 p-2 bg-gray-100 rounded flex justify-between items-center">
        <code className="text-sm text-gray-800">{generatedPassword}</code>
        <button
          onClick={() => {
          navigator.clipboard.writeText(generatedPassword);
          toast.info('Password copied! Redirecting to login...');
          setTimeout(() => {
            router.push('/auth/login');
          }, 2000);
          }}
          className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Copy
        </button>
        </div>
      </div>,
      { autoClose: false }
      );

    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      
      if (!axiosError.response) {
      toast.error('Network error! Please check your internet connection.');
      } else {
      const { status, data } = axiosError.response;

      switch (status) {
        case 404:
        toast.error('Email not found. Please check and try again.');
        break;
        case 400:
        toast.error(data?.message || 'Email not found. Please check and try again');
        break;
        case 500:
        toast.error('Server error! Please try again later.');
        break;
        default:
        toast.error(`Unexpected error. Please try again later.`);
      }
      }
    } finally {
      setLoading(false);
    }
    };

    return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white px-4 py-8"
      style={{
      backgroundImage: `url("/bg-back.avif")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      }}
    >
      <ToastContainer />

      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-6">
      <div className="text-center">
        <Image
        src="/accezz logo.png"
        alt="Accezz Logo"
        width={120}
        height={120}
        className="mx-auto mb-4"
        />
        <h1 className="text-3xl font-semibold text-gray-900">Forgot Password</h1>
        <p className="text-gray-500 mt-2">
        Enter your email to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-2 w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-800"
          placeholder="Enter your email"
        />
        </div>

        <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 rounded-md text-white ${
          loading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'
        } focus:outline-none focus:ring-2 focus:ring-blue-400`}
        >
        {loading ? (
          <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2" />
          Verifying...
          </div>
        ) : (
          'Verify Email'
        )}
        </button>
      </form>
      </div>
    </div>
    );
}

export default ForgotPassword;
