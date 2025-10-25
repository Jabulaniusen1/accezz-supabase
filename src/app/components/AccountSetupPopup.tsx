'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import SuccessModal from './settings/modal/successModal';
import Loader from '../../components/ui/loader/Loader';
import Toast from '../../components/ui/Toast';
import { BASE_URL } from '../../../config';
import { FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';

type AccountData = {
  account_name: string;
  account_bank: string;
  bank_code: string;
  account_number: string;
  currency: string;
  country: string;
};

type Bank = {
  code: string;
  name: string;
};

const AccountSetupPopup = ({ onClose }: { onClose: () => void }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountData, setAccountData] = useState<AccountData>({
    account_name: '',
    account_bank: '',
    bank_code: '',
    account_number: '',
    currency: 'NGN',
    country: 'Nigeria'
  });
  const [accountVerified, setAccountVerified] = useState(false);
  const [fetchingBanks, setFetchingBanks] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  }>({
    type: 'success',
    message: '',
  });

  const toast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);

  // Fetch user's country and currency from localStorage and banks list
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast('error', 'Please login to view your account details');
          router.push('/auth/login');
          return;
        }

        setFetchingBanks(true);
        
        // Get user's country and currency from localStorage
        const country = localStorage.getItem('userCountry') || 'nigeria';
        const currency = localStorage.getItem('userCurrency') || 'NGN';
        
        // Fetch banks for the country
        const banksResponse = await axios.get(
          `${BASE_URL}api/v1/users/banks?country=${encodeURIComponent(country.toLowerCase())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setBanks(banksResponse.data.banks || []);
        setAccountData(prev => ({ 
          ...prev, 
          country,
          currency
        }));

        // Fetch existing account details if any
        const profileResponse = await axios.get(
          `${BASE_URL}api/v1/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (profileResponse.data.user.account_number) {
          setAccountData({
            account_name: profileResponse.data.user.account_name,
            account_bank: profileResponse.data.user.account_bank,
            bank_code: profileResponse.data.user.bank_code,
            account_number: profileResponse.data.user.account_number,
            currency: profileResponse.data.user.currency || currency,
            country: profileResponse.data.user.country || country
          });
          setAccountVerified(true);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        if (axios.isAxiosError(error)) {
          toast('error', error.response?.data?.message || 'Failed to fetch bank details');
        } else {
          toast('error', 'Failed to fetch bank details');
        }
      } finally {
        setFetchingBanks(false);
      }
    };

    fetchData();
  }, [router, toast]);

  const verifyAccount = async () => {
    if (!accountData.account_number || !accountData.bank_code) {
      toast('warning', 'Please fill in account number and select a bank');
      return;
    }

    setVerifying(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast('error', 'Please login to verify account');
        return;
      }

      const response = await axios.post(
        `${BASE_URL}api/v1/users/verify-account`,
        {
          bank_code: accountData.bank_code,
          account_bank: accountData.account_bank,
          account_number: accountData.account_number,
          country: accountData.country
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAccountData(prev => ({
        ...prev,
        account_name: response.data.account_name || prev.account_name,
        account_bank: banks.find(b => b.code === prev.bank_code)?.name || prev.account_bank
      }));
      setAccountVerified(true);
      toast('success', 'Account verified successfully!');
    } catch (error) {
      console.error('Verification error:', error);
      setAccountVerified(false);
      if (axios.isAxiosError(error)) {
        toast('error', error.response?.data?.message || 'Account verification failed. Please check details.');
      } else {
        toast('error', 'Account verification failed. Please check details.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountVerified) {
      toast('warning', 'Please verify your account first');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast('error', 'Please login to update your account details');
        return;
      }

      await axios.patch(
        `${BASE_URL}api/v1/users/profile`,
        accountData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Submission error:', error);
      if (axios.isAxiosError(error)) {
        toast('error', error.response?.data?.message || 'Failed to update account details');
      } else {
        toast('error', 'Failed to update account details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBank = banks.find(bank => bank.code === e.target.value);
    if (selectedBank) {
      setAccountData(prev => ({
        ...prev,
        account_bank: selectedBank.name,
        bank_code: selectedBank.code
      }));
      setAccountVerified(false);
    }
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow numbers
    setAccountData(prev => ({
      ...prev,
      account_number: value
    }));
    setAccountVerified(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl w-full max-w-[95vw] sm:max-w-md max-h-[95vh] overflow-y-auto border border-white/20 dark:border-gray-600/30">
        {/* Header with close button - stacked on mobile */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 sm:mb-6">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Set Up Your Bank Account
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
              Secure and seamless payment integration
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="self-end sm:self-start text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Introductory text - optimized for small screens */}
        <div className="mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2">
            Complete in <span className="font-semibold text-blue-600 dark:text-blue-400">30 seconds</span> to:
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Receive payments instantly</span>
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Enable automatic transfers</span>
            </li>
            <li className="flex items-start">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Get verified for higher limits</span>
            </li>
          </ul>
        </div>
        
        <form onSubmit={handleAccountSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Bank Selection - full width on mobile */}
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">
                Select Your Bank
              </label>
              <div className="relative">
                <select
                  value={accountData.bank_code}
                  onChange={handleBankChange}
                  className="w-full p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8 sm:pr-10 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 text-sm sm:text-base"
                  required
                  disabled={fetchingBanks}
                >
                  <option value="">Choose your bank...</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              {fetchingBanks && (
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 flex items-center animate-pulse">
                  <FaSpinner className="animate-spin mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Loading available banks...
                </div>
              )}
            </div>
            
            {/* Account Number with Verification - stacked on mobile */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">
                Your Account Number
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="text"
                  value={accountData.account_number}
                  onChange={handleAccountNumberChange}
                  className="flex-1 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 text-sm sm:text-base"
                  required
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                />
                <button
                  type="button"
                  onClick={verifyAccount}
                  disabled={verifying || !accountData.account_number || !accountData.bank_code}
                  className={`p-3 sm:px-5 sm:py-4 rounded-lg sm:rounded-xl flex items-center justify-center sm:min-w-[120px] transition-all duration-200 text-sm sm:text-base ${
                    verifying
                      ? 'bg-blue-500 text-white'
                      : accountVerified
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600'
                  }`}
                >
                  {verifying ? (
                    <FaSpinner className="animate-spin mr-1 sm:mr-2 h-4 w-4" />
                  ) : accountVerified ? (
                    <FaCheck className="mr-1 sm:mr-2 h-4 w-4" />
                  ) : (
                    <FaTimes className="mr-1 sm:mr-2 h-4 w-4" />
                  )}
                  <span className="whitespace-nowrap">
                    {verifying ? 'Checking' : accountVerified ? 'Verified' : 'Verify'}
                  </span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter your 10-digit account number without special characters
              </p>
            </div>
            
            {/* Account Name (auto-filled after verification) */}
            {accountData.account_name && (
              <div className="animate-fade-in">
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">
                  Account Holder Name
                </label>
                <div className="p-3 sm:p-4 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm sm:text-base">
                  {accountData.account_name}
                </div>
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified account name from your bank
                </p>
              </div>
            )}
          </div>
          
          {/* Action Buttons - full width on mobile */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-sm disabled:opacity-50 text-sm sm:text-base"
              disabled={loading}
            >
              Maybe Later
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-white transition-all duration-200 hover:shadow-md flex items-center justify-center text-sm sm:text-base ${
                loading
                  ? 'bg-blue-500'
                  : accountVerified
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              }`}
              disabled={loading || !accountVerified}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-1 sm:mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </form>

        {/* Loading indicator */}
        {loading && <Loader />}

        {/* Success modal */}
        {showModal && (
          <SuccessModal
            title="Setup Complete!"
            message="Your bank account is now ready to receive payments. Start transacting immediately!"
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Toast notifications */}
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AccountSetupPopup;