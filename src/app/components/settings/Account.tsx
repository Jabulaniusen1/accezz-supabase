'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SuccessModal from './modal/successModal';
import Toast from '../../../components/ui/Toast';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { supabase } from '@/utils/supabaseClient';

type AccountData = {
  account_name: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  currency: string;
  country: string;
};

type Bank = {
  code: string;
  name: string;
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  nigeria: 'NGN',
  ghana: 'GHS',
  'south africa': 'ZAR',
  kenya: 'KES',
  tanzania: 'TZS',
  zambia: 'ZMW',
  rwanda: 'RWF',
  senegal: 'XOF',
  cameroon: 'XAF',
  'ivory coast': 'XOF',
  ethiopia: 'ETB',
  egypt: 'EGP',
  morocco: 'MAD',
  algeria: 'DZD',
  tunisia: 'TND',
  angola: 'AOA',
  mozambique: 'MZN',
  botswana: 'BWP',
  zimbabwe: 'USD',
  'united kingdom': 'GBP',
  uk: 'GBP',
  'united states': 'USD',
  us: 'USD',
  usa: 'USD',
};

const Account = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountData, setAccountData] = useState<AccountData>({
    account_name: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    currency: 'NGN',
    country: 'nigeria'
  });

  // Currency options with full names
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

  // Country options - Popular African countries + UK and US
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

  // Helper function to get currency for country
  const getCurrencyForCountry = useCallback((country: string): string => {
    return COUNTRY_CURRENCY_MAP[country.toLowerCase()] || 'NGN';
  }, []);

  // Helper function to capitalize country name
  const capitalizeCountry = (country: string): string => {
    return country.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: 'success' | 'error';
    message: string;
  }>({
    type: 'success',
    message: '',
  });

  const toast = useCallback((type: 'success' | 'error', message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast('error', 'Please login to view your account details');
          router.push('/auth/login');
          return;
        }

        setFetchingBanks(true);
        
        // Get user's country from localStorage or default
        const country = localStorage.getItem('userCountry') || 'nigeria';
        
        // Fetch banks from Paystack API
        try {
          const banksResponse = await fetch(`/api/paystack/banks?country=${encodeURIComponent(country)}`);
          const banksData = await banksResponse.json();
          
          if (banksResponse.ok && banksData.banks) {
            setBanks(banksData.banks);
          } else {
            toast('error', 'Failed to fetch banks list');
          }
        } catch (error) {
          console.error('Error fetching banks:', error);
          toast('error', 'Failed to fetch banks list');
        }

        // Fetch profile from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_name, account_number, bank_code, bank_name, country, currency')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile?.account_number) {
          const profileCountry = profile.country || country;
          const profileCurrency = profile.currency || getCurrencyForCountry(profileCountry);
          setAccountData({
            account_name: profile.account_name || '',
            bank_name: profile.bank_name || '',
            bank_code: profile.bank_code || '',
            account_number: profile.account_number,
            currency: profileCurrency,
            country: profileCountry
          });
          setHasExistingAccount(true);
        } else {
          const defaultCurrency = getCurrencyForCountry(country);
          setAccountData(prev => ({
            ...prev,
            country,
            currency: profile?.currency || defaultCurrency
          }));
        }
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch account data';
        toast('error', message);
      } finally {
        setFetchingBanks(false);
      }
    };

    fetchData();
  }, [router, toast, getCurrencyForCountry]);

  const verifyAccount = async () => {
    if (!accountData.account_number || !accountData.bank_code) {
      toast('error', 'Please fill in account number and select a bank');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch('/api/paystack/verify-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: accountData.account_number,
          bank_code: accountData.bank_code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Account verification failed');
      }

      // Update account name from verification
      setAccountData(prev => ({
        ...prev,
        account_name: data.account_name || prev.account_name
      }));
      
      toast('success', 'Account verified successfully!');
    } catch (error: unknown) {
      console.error('Verification error:', error);
      const message = error instanceof Error ? error.message : 'Account verification failed. Please check details.';
      toast('error', message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountData.account_name) {
      toast('error', 'Please verify your account number first');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast('error', 'Please login to update your account details');
        router.push('/auth/login');
        return;
      }

      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: session.user.id,
          account_name: accountData.account_name,
          account_number: accountData.account_number,
          bank_code: accountData.bank_code,
          bank_name: accountData.bank_name,
          currency: accountData.currency,
          country: accountData.country,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        throw updateError;
      }

      setShowModal(true);
      setHasExistingAccount(true);
      setShowForm(false);
      toast('success', 'Account details updated successfully!');
    } catch (error: unknown) {
      console.error('Update error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update account details';
      toast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl py-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
          Manage your payment information and bank account details
        </p>
      </div>

      {/* Currency and Country Selectors */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Payment Preferences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <SearchableSelect
              options={currencyOptions}
              value={accountData.currency}
              onChange={(value) => setAccountData(prev => ({ ...prev, currency: value }))}
              placeholder="Select currency"
              searchPlaceholder="Search currency..."
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <SearchableSelect
              options={countryOptions}
              value={accountData.country}
              onChange={(value) => {
                const newCurrency = getCurrencyForCountry(value);
                setAccountData(prev => ({ 
                  ...prev, 
                  country: value,
                  currency: newCurrency 
                }));
                // Refetch banks when country changes
                setFetchingBanks(true);
                fetch(`/api/paystack/banks?country=${encodeURIComponent(value)}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.banks) {
                      setBanks(data.banks);
                    }
                    setFetchingBanks(false);
                  })
                  .catch(err => {
                    console.error('Error fetching banks:', err);
                    setFetchingBanks(false);
                  });
              }}
              placeholder="Select country"
              searchPlaceholder="Search country..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Account Card Display */}
      {hasExistingAccount && !showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Account</h2>
            <button
              onClick={() => setShowForm(true)}
              style={{ borderRadius: '5px' }}
              className="px-4 py-2 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-lg hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transition-all duration-200 transform hover:scale-105 text-sm font-medium"
            >
              Edit Account
            </button>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#f54502] to-[#d63a02] rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{accountData.bank_name}</h3>
                  <p className="text-gray-300 text-sm">Bank Account</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">Account Number</p>
                  <p className="text-lg font-mono">
                    {accountData.account_number && accountData.account_number.length >= 4 
                      ? `****${accountData.account_number.slice(-4)}` 
                      : '****'}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-300">Account Holder</p>
                <p className="text-lg font-medium">{accountData.account_name}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-300">Currency</p>
                  <p className="font-medium">{accountData.currency}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">Country</p>
                  <p className="font-medium capitalize">{accountData.country}</p>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 opacity-20">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="15" stroke="white" strokeWidth="2"/>
                  <circle cx="20" cy="20" r="8" stroke="white" strokeWidth="1"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Form */}
      {(!hasExistingAccount || showForm) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {hasExistingAccount ? 'Edit Account Details' : 'Add Bank Account'}
            </h2>
            {showForm && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors dark:text-gray-200 dark:hover:text-gray-400 text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {accountData.country ? `Banks in ${capitalizeCountry(accountData.country)}` : 'Bank'}
                </label>
                <SearchableSelect
                  options={banks.map(bank => ({ value: bank.code, label: bank.name }))}
                  value={accountData.bank_code}
                  onChange={(value) => {
                    const selectedBank = banks.find(bank => bank.code === value);
                    if (selectedBank) {
                      setAccountData(prev => ({
                        ...prev,
                        bank_name: selectedBank.name,
                        bank_code: selectedBank.code
                      }));
                    }
                  }}
                  placeholder={fetchingBanks ? 'Loading banks...' : 'Select Bank'}
                  searchPlaceholder="Search bank..."
                  disabled={fetchingBanks}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accountData.account_number}
                    onChange={(e) => setAccountData(prev => ({ ...prev, account_number: e.target.value.replace(/\D/g, '') }))}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                    style={{ borderRadius: '5px' }} 
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    minLength={6}
                    placeholder="Enter account number"
                  />
                  <button
                    type="button"
                    onClick={verifyAccount}
                    disabled={verifying || !accountData.account_number || !accountData.bank_code}
                    style={{ borderRadius: '5px' }}
                    className="px-4 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white hover:from-[#f54502]/90 hover:to-[#d63a02]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium whitespace-nowrap"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Name
              </label>
              <input
                type="text"
                value={accountData.account_name}
                onChange={(e) => setAccountData(prev => ({ ...prev, account_name: e.target.value }))}
                style={{ borderRadius: '5px' }}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                required
                placeholder="Account name will appear here after verification"
                readOnly={!accountData.account_name}
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading || !accountData.account_name}
                style={{ borderRadius: '5px' }} 
                className="px-8 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white hover:from-[#f54502]/90 hover:to-[#d63a02]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 font-medium"
              >
                {loading ? 'Updating...' : hasExistingAccount ? 'Update Account' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showModal && (
        <SuccessModal
          title="Account Updated"
          message="Your payment information has been successfully updated."
          onClose={() => setShowModal(false)}
        />
      )}

      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default Account;
