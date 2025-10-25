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
    <div className="w-full sm:max-w-4xl p-2 sm:p-6 space-y-8 animate-fadeIn">
      {loading && <Loader />}
      
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Payment Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
           Manage your payment information and view transaction history
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full sm:flex-row sm:gap-4 sm:w-auto">
          <div className="relative w-full sm:w-40">
        <select
          value={accountData.currency}
          onChange={(e) => setAccountData(prev => ({ ...prev, currency: e.target.value }))}
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 shadow-sm text-sm"
        >
          <option value="NGN">NGN - Naira</option>
          <option value="NGN">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
        </select>
          </div>
          <div className="relative w-full sm:w-40">
        <select
          value={accountData.country}
          onChange={(e) => setAccountData(prev => ({ ...prev, country: e.target.value }))}
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 shadow-sm text-sm"
        >
          <option value="nigeria">Nigeria</option>
          <option value="ghana">Ghana</option>
          <option value="south africa">South Africa</option>
          <option value="kenya">Kenya</option>
        </select>
          </div>
        </div>
      </div>

      {hasExistingAccount && !showForm && (
        <div className="relative group max-w-full sm:max-w-md mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt">
            <div 
              className="relative p-4 sm:p-6 rounded-2xl shadow-xl overflow-hidden flex flex-col gap-4"
              style={{
                background: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('https://img.freepik.com/free-vector/gradient-blue-abstract-technology-background_23-2149213765.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-2">
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-white">{accountData.account_bank}</h3>
                  <p className="text-gray-200 text-sm sm:text-base">****{accountData.account_number.slice(-4)}</p>
                  <p className="text-xs sm:text-sm text-gray-300">{accountData.account_name}</p>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 sm:mt-0 text-white hover:text-blue-200 transition-colors bg-blue-500/30 px-3 py-1 rounded-lg text-sm"
                >
                  Edit
                </button>
              </div>
              <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 opacity-50">
                <svg width="48" height="32" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="30" cy="20" r="18" stroke="white" strokeWidth="2" strokeOpacity="0.5"/>
                  <circle cx="40" cy="20" r="18" stroke="white" strokeWidth="2" strokeOpacity="0.5"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {(!hasExistingAccount || showForm) && (
        <form 
          onSubmit={handleSubmit} 
          className="space-y-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg animate-slideUp max-w-full sm:max-w-md mx-auto"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Bank</label>
              <select
                value={accountData.bank_code}
                onChange={handleBankChange}
                className="w-full p-2 border rounded-lg bg-transparent text-sm"
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
              <label className="block text-sm font-medium mb-2">Account Number</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
              type="text"
              value={accountData.account_number}
              onChange={(e) => setAccountData(prev => ({ ...prev, account_number: e.target.value }))}
              className="flex-1 p-2 border rounded-lg bg-transparent text-sm"
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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 text-sm"
                >
              {verifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Account Name</label>
              <input
                type="text"
                value={accountData.account_name}
                onChange={(e) => setAccountData(prev => ({ ...prev, account_name: e.target.value }))}
                className="w-full p-2 border rounded-lg bg-transparent text-sm"
                required
                readOnly={!!accountData.account_name}
                placeholder="Account name will appear here"
              />
            </div>
          </div>
              
          <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {showForm && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors dark:text-gray-200 dark:hover:text-blue-400 text-sm"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 text-sm"
            >
              {hasExistingAccount ? 'Update Account' : 'Add Account'}
            </button>
          </div>
        </form>
      )}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(transaction.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-medium ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatPrice(transaction.amount, accountData.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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