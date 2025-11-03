'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import Loader from '../../components/ui/loader/Loader';
import Toast from '../../components/ui/Toast';
import SearchableSelect from '@/components/ui/SearchableSelect';
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

  // Country to currency mapping
  const countryCurrencyMap: Record<string, string> = {
    'nigeria': 'NGN',
    'ghana': 'GHS',
    'south africa': 'ZAR',
    'kenya': 'KES',
    'tanzania': 'TZS',
    'zambia': 'ZMW',
    'rwanda': 'RWF',
    'senegal': 'XOF',
    'cameroon': 'XAF',
    'ivory coast': 'XOF',
    'ethiopia': 'ETB',
    'egypt': 'EGP',
    'morocco': 'MAD',
    'algeria': 'DZD',
    'tunisia': 'TND',
    'angola': 'AOA',
    'mozambique': 'MZN',
    'botswana': 'BWP',
    'zimbabwe': 'USD',
    'united kingdom': 'GBP',
    'uk': 'GBP',
    'united states': 'USD',
    'us': 'USD',
    'usa': 'USD',
  };

  const currencyOptions = [
    { value: 'NGN', label: 'NGN - Nigerian Naira' },
    { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
    { value: 'ZAR', label: 'ZAR - South African Rand' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
    { value: 'ZMW', label: 'ZMW - Zambian Kwacha' },
    { value: 'RWF', label: 'RWF - Rwandan Franc' },
    { value: 'XOF', label: 'XOF - West African CFA Franc' },
    { value: 'XAF', label: 'XAF - Central African CFA Franc' },
    { value: 'ETB', label: 'ETB - Ethiopian Birr' },
    { value: 'EGP', label: 'EGP - Egyptian Pound' },
    { value: 'MAD', label: 'MAD - Moroccan Dirham' },
    { value: 'DZD', label: 'DZD - Algerian Dinar' },
    { value: 'TND', label: 'TND - Tunisian Dinar' },
    { value: 'AOA', label: 'AOA - Angolan Kwanza' },
    { value: 'MZN', label: 'MZN - Mozambican Metical' },
    { value: 'BWP', label: 'BWP - Botswanan Pula' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
  ];

  const countryOptions = [
    { value: 'nigeria', label: 'Nigeria' },
    { value: 'ghana', label: 'Ghana' },
    { value: 'south africa', label: 'South Africa' },
    { value: 'kenya', label: 'Kenya' },
    { value: 'tanzania', label: 'Tanzania' },
    { value: 'zambia', label: 'Zambia' },
    { value: 'rwanda', label: 'Rwanda' },
    { value: 'senegal', label: 'Senegal' },
    { value: 'cameroon', label: 'Cameroon' },
    { value: 'ivory coast', label: 'Ivory Coast' },
    { value: 'ethiopia', label: 'Ethiopia' },
    { value: 'egypt', label: 'Egypt' },
    { value: 'morocco', label: 'Morocco' },
    { value: 'algeria', label: 'Algeria' },
    { value: 'tunisia', label: 'Tunisia' },
    { value: 'angola', label: 'Angola' },
    { value: 'mozambique', label: 'Mozambique' },
    { value: 'botswana', label: 'Botswana' },
    { value: 'zimbabwe', label: 'Zimbabwe' },
    { value: 'united kingdom', label: 'United Kingdom' },
    { value: 'united states', label: 'United States' },
  ];

  const getCurrencyForCountry = (country: string): string => {
    return countryCurrencyMap[country.toLowerCase()] || 'NGN';
  };

  const handleCountryChange = async (country: string) => {
    const currency = getCurrencyForCountry(country);
    setAccountData(prev => ({
      ...prev,
      country,
      currency,
      bank_code: '',
      account_bank: '',
    }));
    setAccountVerified(false);
    
    // Fetch banks for the selected country
    setFetchingBanks(true);
    try {
      const banksResponse = await fetch(`/api/paystack/banks?country=${encodeURIComponent(country)}`);
      const banksData = await banksResponse.json();
      if (banksResponse.ok && banksData.banks) {
        setBanks(banksData.banks);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setFetchingBanks(false);
    }
  };

  const handleCurrencyChange = (currency: string) => {
    setAccountData(prev => ({
      ...prev,
      currency,
    }));
  };

  const bankOptions = banks.map(bank => ({
    value: bank.code,
    label: bank.name,
  }));

  // Fetch user's country and currency from localStorage and banks list
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast('error', 'Please login to view your account details');
          router.push('/auth/login');
          return;
        }

        // Get user's country and currency from localStorage
        let country = localStorage.getItem('userCountry') || 'nigeria';
        let currency = localStorage.getItem('userCurrency') || 'NGN';

        // Fetch existing account details from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_name, account_number, bank_code, bank_name, country, currency')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!profileError && profile?.account_number) {
          country = profile.country || country;
          currency = profile.currency || currency;
          setAccountData({
            account_name: profile.account_name || '',
            account_bank: profile.bank_name || '',
            bank_code: profile.bank_code || '',
            account_number: profile.account_number,
            currency,
            country
          });
          setAccountVerified(true);
        } else {
          setAccountData(prev => ({ 
            ...prev, 
            country,
            currency
          }));
        }

        // Fetch banks for the country
        setFetchingBanks(true);
        try {
          const banksResponse = await fetch(`/api/paystack/banks?country=${encodeURIComponent(country)}`);
          const banksData = await banksResponse.json();
          if (banksResponse.ok && banksData.banks) {
            setBanks(banksData.banks);
          }
        } catch (error) {
          console.error('Error fetching banks:', error);
        } finally {
          setFetchingBanks(false);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        toast('error', 'Failed to fetch bank details');
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
      const response = await fetch('/api/paystack/verify-bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number: accountData.account_number,
          bank_code: accountData.bank_code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify account');
      }

      setAccountData(prev => ({
        ...prev,
        account_name: data.account_name || prev.account_name,
        account_bank: banks.find(b => b.code === prev.bank_code)?.name || prev.account_bank
      }));
      setAccountVerified(true);
      toast('success', 'Account verified successfully!');
    } catch (error) {
      console.error('Verification error:', error);
      setAccountVerified(false);
      const message = error instanceof Error ? error.message : 'Account verification failed. Please check details.';
      toast('error', message);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast('error', 'Please login to update your account details');
        return;
      }

      // Update or insert profile with bank details
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: session.user.id,
          account_name: accountData.account_name,
          account_number: accountData.account_number,
          bank_code: accountData.bank_code,
          bank_name: accountData.account_bank,
          currency: accountData.currency,
          country: accountData.country,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      toast('success', 'Bank account setup complete! Your account is ready to receive payments.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update account details';
      toast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBankChange = (bankCode: string) => {
    const selectedBank = banks.find(bank => bank.code === bankCode);
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
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg w-full max-w-md max-h-[95vh] overflow-y-auto border border-gray-200 dark:border-gray-600" style={{ borderRadius: '5px' }}>
        {/* Header with close button */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold bg-gradient-to-r from-[#f54502] to-[#d63a02] bg-clip-text text-transparent">
              Set Up Your Bank Account
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Secure and seamless payment integration
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Country Selection */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Country
              </label>
              <SearchableSelect
                options={countryOptions}
                value={accountData.country}
                onChange={handleCountryChange}
                placeholder="Select your country"
                searchPlaceholder="Search countries..."
                className="text-sm"
              />
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Currency
              </label>
              <SearchableSelect
                options={currencyOptions}
                value={accountData.currency}
                onChange={handleCurrencyChange}
                placeholder="Select currency"
                searchPlaceholder="Search currencies..."
                className="text-sm"
              />
            </div>

            {/* Bank Selection */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Bank
              </label>
              <SearchableSelect
                options={bankOptions}
                value={accountData.bank_code}
                onChange={handleBankChange}
                placeholder="Select your bank"
                searchPlaceholder="Search banks..."
                disabled={fetchingBanks || !accountData.country}
                className="text-sm"
              />
              {fetchingBanks && (
                <div className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 flex items-center">
                  <FaSpinner className="animate-spin mr-1.5 h-3 w-3" />
                  Loading banks...
                </div>
              )}
            </div>
            
            {/* Account Number with Verification */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Account Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accountData.account_number}
                  onChange={handleAccountNumberChange}
                  className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-all duration-200 text-sm"
                  style={{ borderRadius: '5px' }}
                  required
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                />
                <button
                  type="button"
                  onClick={verifyAccount}
                  disabled={verifying || !accountData.account_number || !accountData.bank_code}
                  className={`px-4 py-2.5 flex items-center justify-center min-w-[100px] transition-all duration-200 text-sm ${
                    verifying
                      ? 'bg-blue-500 text-white'
                      : accountVerified
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600'
                  }`}
                  style={{ borderRadius: '5px' }}
                >
                  {verifying ? (
                    <FaSpinner className="animate-spin mr-1.5 h-3.5 w-3.5" />
                  ) : accountVerified ? (
                    <FaCheck className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <FaTimes className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  <span className="whitespace-nowrap text-xs">
                    {verifying ? 'Checking' : accountVerified ? 'Verified' : 'Verify'}
                  </span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter your 10-digit account number
              </p>
            </div>
            
            {/* Account Name (auto-filled after verification) */}
            {accountData.account_name && (
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  Account Holder Name
                </label>
                <div className="p-2.5 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm" style={{ borderRadius: '5px' }}>
                  {accountData.account_name}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 text-sm"
              style={{ borderRadius: '5px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white transition-all duration-200 flex items-center justify-center text-sm ${
                loading
                  ? 'bg-blue-500'
                  : accountVerified
                    ? 'bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90'
                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              }`}
              style={{ borderRadius: '5px' }}
              disabled={loading || !accountVerified}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-1.5 h-3.5 w-3.5" />
                  <span className="text-xs">Processing...</span>
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </form>

        {/* Loading indicator */}
        {loading && <Loader />}

        {/* Toast notifications */}
        {showToast && (
          <div className="fixed top-4 right-4 z-[60]">
            <Toast
              type={toastProps.type}
              message={toastProps.message}
              onClose={() => setShowToast(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSetupPopup;