'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import SuccessModal from './modal/successModal';
import Loader from '../../../components/ui/loader/Loaders';
import Toast from '../../../components/ui/Toast';
import { formatPrice } from '@/utils/formatPrice';
import { BASE_URL } from '../../../../config';

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

type Transaction = {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  date: string;
};

type Event = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  date: string;
  location: string;
  time: string;
  venue: string;
  hostName: string;
  ticketType: TicketType[];
  gallery: string | null;
  socialMediaLinks: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type TicketType = {
  name: string;
  sold: string;
  price: string;
  quantity: string;
  details: string;
  attendees?: { name: string; email: string }[];
};

const Account = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountData, setAccountData] = useState<AccountData>({
    account_name: '',
    account_bank: '',
    bank_code: '',
    account_number: '',
    currency: 'NGN',
    country: 'nigeria'
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
        const token = localStorage.getItem('token');
        if (!token) {
          toast('error', 'Please login to view your account details');
          router.push('/auth/login');
          return;
        }

        // Get user's country and fetch banks
        const country = localStorage.getItem('userCountry') || 'nigeria';
        // alert(country);
        const banksResponse = await axios.get(
          `${BASE_URL}api/v1/users/banks?country=${encodeURIComponent(country)}`,
        );
        setBanks(banksResponse.data.banks || []);

        // Fetch account details
        const profileResponse = await axios.get(
          `${BASE_URL}api/v1/users/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (profileResponse.data.user.account_number) {
          setAccountData({
            account_name: profileResponse.data.user.account_name,
            account_bank: profileResponse.data.user.account_bank,
            bank_code: profileResponse.data.user.bank_code || '',
            account_number: profileResponse.data.user.account_number,
            currency: profileResponse.data.user.currency || 'NGN',
            country: profileResponse.data.user.country || country
          });
          setHasExistingAccount(true);
        }

        // Fetch transactions
        const eventsResponse = await axios.get(
          `${BASE_URL}api/v1/events/my-events`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const transactions: Transaction[] = eventsResponse.data.events.flatMap((event: Event) =>
          event.ticketType
            .map((ticket) => ({
              id: `${event.id}-${ticket.name}`,
              amount: parseFloat(ticket.price) * parseFloat(ticket.sold),
              type: 'credit',
              description: `Ticket sale - ${event.title}`,
              date: event.date,
            }))
            .filter(transaction => transaction.amount > 0)
        );

        setTransactions(transactions);
      } catch (error) {
        console.error(error);
        toast('error', 'Failed to fetch data');
      }
    };

    fetchData();
  }, [router, toast]);

  const verifyAccount = async () => {
    if (!accountData.account_number || !accountData.bank_code) {
      toast('error', 'Please fill in all bank details');
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
        account_name: response.data.account_name || prev.account_name
      }));
      toast('success', 'Account verified successfully!');
    } catch (error) {
      console.error(error);
      toast('error', 'Account verification failed. Please check details.');
    } finally {
      setVerifying(false);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setHasExistingAccount(true);
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast('error', 'Failed to update account details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {loading && <Loader />}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
          Manage your payment information, bank account details, and view transaction history
        </p>
      </div>
      {/* Currency and Country Selectors */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Payment Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={accountData.currency}
              onChange={(e) => setAccountData(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
            >
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <select
              value={accountData.country}
              onChange={(e) => setAccountData(prev => ({ ...prev, country: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
            >
              <option value="nigeria">Nigeria</option>
              <option value="ghana">Ghana</option>
              <option value="south africa">South Africa</option>
              <option value="kenya">Kenya</option>
            </select>
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
                  <h3 className="text-lg font-semibold">{accountData.account_bank}</h3>
                  <p className="text-gray-300 text-sm">Bank Account</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">Account Number</p>
                  <p className="text-lg font-mono">****{accountData.account_number.slice(-4)}</p>
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
                  Bank
                </label>
                <select
                  value={accountData.bank_code}
                  onChange={handleBankChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                  required
                >
                  <option value="">Select Bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accountData.account_number}
                    onChange={(e) => setAccountData(prev => ({ ...prev, account_number: e.target.value }))}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
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
                    disabled={verifying}
                    className="px-4 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-lg hover:from-[#f54502]/90 hover:to-[#d63a02]/90 disabled:bg-[#f54502]/50 transition-all duration-200 text-sm font-medium whitespace-nowrap"
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
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-colors"
                required
                placeholder="Account name will appear here after verification"
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-lg hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transform hover:scale-105 transition-all duration-200 font-medium"
              >
                {hasExistingAccount ? 'Update Account' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transaction History</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Your transaction history will appear here once you start selling tickets.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {transactions.map((transaction, index) => (
                    <tr key={transaction.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(transaction.date).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(transaction.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Ticket Sale
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`text-sm font-semibold ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.type === 'credit' ? '+' : '-'}{formatPrice(transaction.amount, accountData.currency)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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