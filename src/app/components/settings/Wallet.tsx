'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Toast from '@/components/ui/Toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Wallet = () => {
  const [balance, setBalance] = useState<number>(0);
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState<{ type: 'success' | 'error' | 'info', message: string }>({ type: 'info', message: '' });

  const toast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToastData({ type, message });
    setShowToast(true);
  }, []);

  const maskedBalance = useMemo(() => {
    if (isHidden) return '•••••••';
    return `₦${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [isHidden, balance]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast('error', 'Please login to view your wallet');
          return;
        }
        const { data, error } = await supabase.rpc('get_my_available_balance');
        if (!error && typeof data === 'number') setBalance(Number(data));
      } catch (e) {
        // silent
      }
    };
    load();
  }, [toast]);

  // Format number with commas
  const formatNumberWithCommas = (value: string): string => {
    // Remove all non-digit characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Split by decimal point
    const parts = numericValue.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts[1] || '';
    
    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Combine with decimal part (limit to 2 decimal places)
    return decimalPart ? `${formattedInteger}.${decimalPart.slice(0, 2)}` : formattedInteger;
  };

  // Parse formatted number back to number (remove commas)
  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string
    if (value === '') {
      setWithdrawAmount('');
      return;
    }
    // Format with commas
    const formatted = formatNumberWithCommas(value);
    setWithdrawAmount(formatted);
  };

  const handleWithdraw = async () => {
    const amt = parseFormattedNumber(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast('error', 'Enter a valid amount');
      return;
    }
    if (amt > balance) {
      toast('error', 'Amount exceeds available balance');
      return;
    }
    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch('/api/paystack/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Withdrawal failed');
      toast('success', 'Withdrawal initiated');
      setBalance(prev => Math.max(0, prev - amt));
      setWithdrawAmount('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Withdrawal failed';
      toast('error', msg);
    } finally {
      setWithdrawing(false);
    }
  };

  const vtuClick = () => {
    toast('info', 'Coming soon');
  };

  return (
    <div className="max-w-6xl py-6 space-y-8">
      {/* Wallet Header */}
      <div className="bg-gradient-to-br from-[#111827] to-[#0b0f1a] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-72 h-72 bg-[#f54502] rounded-full blur-3xl absolute -top-16 -left-10"></div>
          <div className="w-72 h-72 bg-[#d63a02] rounded-full blur-3xl absolute -bottom-16 -right-10"></div>
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-300">Wallet Balance</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl md:text-4xl font-bold tracking-tight">
                {maskedBalance}
              </span>
              <button
                onClick={() => setIsHidden(v => !v)}
                className="p-2 bg-white/10 hover:bg-white/15 rounded-md border border-white/10"
                aria-label={isHidden ? 'Show balance' : 'Hide balance'}
                title={isHidden ? 'Show balance' : 'Hide balance'}
              >
                {isHidden ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Currency</p>
            <p className="text-sm font-medium">NGN</p>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdraw Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Withdraw money</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (NGN)</label>
              <input
                type="text"
                inputMode="decimal"
                value={withdrawAmount}
                onChange={handleAmountChange}
                style={{ borderRadius: '6px' }}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502]"
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              disabled={withdrawing || !withdrawAmount || parseFormattedNumber(withdrawAmount) <= 0}
              onClick={handleWithdraw}
              style={{ borderRadius: '6px' }}
              className="px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white hover:from-[#f54502]/90 hover:to-[#d63a02]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
            >
              {withdrawing ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Transfers are processed by Paystack. Pending withdrawals temporarily reduce your available balance.</p>
        </div>

        {/* VTU Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">VTU Services</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={vtuClick} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
              <div className="w-10 h-10 rounded-md bg-[#f54502]/10 flex items-center justify-center mb-2 text-[#f54502]">A</div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Buy Airtime</p>
              <p className="text-xs text-gray-500">All networks</p>
            </button>
            <button onClick={vtuClick} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
              <div className="w-10 h-10 rounded-md bg-[#d63a02]/10 flex items-center justify-center mb-2 text-[#d63a02]">D</div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Buy Data</p>
              <p className="text-xs text-gray-500">Affordable bundles</p>
            </button>
            <button onClick={vtuClick} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
              <div className="w-10 h-10 rounded-md bg-[#0ea5e9]/10 flex items-center justify-center mb-2 text-[#0ea5e9]">C</div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Cable TV</p>
              <p className="text-xs text-gray-500">DSTV, GOTV</p>
            </button>
            <button onClick={vtuClick} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left">
              <div className="w-10 h-10 rounded-md bg-[#10b981]/10 flex items-center justify-center mb-2 text-[#10b981]">E</div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Electricity</p>
              <p className="text-xs text-gray-500">Prepaid/Postpaid</p>
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">More services coming soon.</p>
        </div>
      </div>

      {showToast && (
        <Toast
          type={toastData.type === 'info' ? 'success' : toastData.type}
          message={toastData.message}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default Wallet;


