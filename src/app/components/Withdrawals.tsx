'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { notifyWithdrawalRequest } from '@/utils/notificationClient';
import AccountSetupPopup from './AccountSetupPopup';
import type { Event } from '@/types/event';
import type { WithdrawalRequest } from '@/types/withdrawal';
import { Toast } from './Toast';

const PLATFORM_FEE_RATE = 0.06;
const NET_MULTIPLIER = 1 - PLATFORM_FEE_RATE;
const calculateNetRevenue = (price: string | number, sold: string | number): number => {
  const numericPrice = typeof price === 'number' ? price : parseFloat(price || '0');
  const numericSold = typeof sold === 'number' ? sold : parseFloat(sold || '0');
  if (Number.isNaN(numericPrice) || Number.isNaN(numericSold)) {
    return 0;
  }
  return numericPrice * numericSold * NET_MULTIPLIER;
};



const Withdrawals: React.FC = () => {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string }>({ type: 'success', message: '' });
  const [hasBankDetails, setHasBankDetails] = useState<boolean | null>(null);
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const [currency, setCurrency] = useState<string>('NGN');
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [rawAmount, setRawAmount] = useState<number | null>(null);
  const [displayAmount, setDisplayAmount] = useState<string>('');

  const toast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);

  // Format helpers
  const formatCurrency = useCallback((amount: number) => {
    if (isNaN(amount)) return '₦0';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN', minimumFractionDigits: 2 }).format(amount);
  }, [currency]);

  const formatWithCommas = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value);
  }, []);

  const parseInputToNumber = (input: string) => {
    const cleaned = input.replace(/[,\s]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  const onAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = parseInputToNumber(val);
    setRawAmount(num);
    if (num === null) {
      setDisplayAmount(val.replace(/[^0-9.]/g, ''));
    } else {
      setDisplayAmount(formatWithCommas(num));
    }
  };

  // Load events to calculate earnings
  const { data: events } = useQuery<Event[]>({
    queryKey: ['userEventsForWithdrawals'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast('error', 'Please log in to view withdrawals');
        router.push('/auth/login');
        return [];
      }
      const { data: evs, error: evErr } = await supabase
        .from('events')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (evErr) throw evErr;
      const eventIds = (evs || []).map(e => e.id);
      const ticketMap = new Map<string, Array<{ event_id: string; price: number | string; sold: number | string }>>();
      if (eventIds.length) {
        const { data: tickets } = await supabase
          .from('ticket_types')
          .select('event_id, price, sold')
          .in('event_id', eventIds);
        (tickets || []).forEach(t => {
          const arr = ticketMap.get(t.event_id as string) || [];
          arr.push(t);
          ticketMap.set(t.event_id as string, arr);
        });
      }
      const list: Event[] = (evs || []).map(e => ({
        id: e.id as string,
        slug: e.id as string,
        title: '',
        description: '',
        image: '',
        date: '',
        time: '',
        venue: '',
        location: '',
        hostName: '',
        gallery: [],
        isVirtual: false,
        createdAt: e.created_at as string,
        ticketType: (ticketMap.get(e.id as string) || []).map(t => ({
          name: '',
          price: String(t.price ?? '0'),
          quantity: '0',
          sold: String(t.sold ?? '0'),
          details: undefined,
        })),
      }));
      return list;
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalEarnings = useMemo(() => {
    return events?.reduce((total, event) => {
      const eventNet = event.ticketType?.reduce((subtotal, ticket) => subtotal + calculateNetRevenue(ticket.price, ticket.sold), 0) || 0;
      return total + eventNet;
    }, 0) || 0;
  }, [events]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_number, bank_code, bank_name, currency')
          .eq('user_id', session.user.id)
          .maybeSingle();
        const ok = Boolean(profile?.account_number && profile?.bank_code && profile?.bank_name);
        setHasBankDetails(ok);
        if (profile?.currency) setCurrency(profile.currency);

        const { data: withdrawals } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        setMyWithdrawals(withdrawals || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const pendingTotal = useMemo(() => {
    const pendingStatuses = new Set(['pending', 'processing']);
    return myWithdrawals
      .filter(w => pendingStatuses.has((w.status || '').toLowerCase()))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  }, [myWithdrawals]);

  const approvedTotal = useMemo(() => {
    const approvedStatuses = new Set(['approved', 'completed', 'paid']);
    return myWithdrawals
      .filter(w => approvedStatuses.has((w.status || '').toLowerCase()))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  }, [myWithdrawals]);

  const availableBalance = useMemo(
    () => Math.max(0, totalEarnings - pendingTotal - approvedTotal),
    [totalEarnings, pendingTotal, approvedTotal]
  );

  const submitWithdrawal = useCallback(async () => {
    if (!hasBankDetails) {
      setShowAccountPopup(true);
      return;
    }
    const amountNum = rawAmount ?? 0;
    if (!amountNum || amountNum <= 0) {
      toast('warning', 'Enter a valid amount');
      return;
    }
    if (amountNum > availableBalance) {
      toast('warning', 'Amount exceeds available balance');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: inserted, error } = await supabase
        .from('withdrawal_requests')
        .insert({ user_id: session.user.id, amount: amountNum, currency })
        .select('id')
        .single();
      if (error) throw error;
      if (inserted?.id) {
        await notifyWithdrawalRequest(inserted.id);
      }
      toast('success', 'Withdrawal request submitted');
      setRawAmount(null);
      setDisplayAmount('');
      setShowSuccessModal(true);
      const { data: refreshed } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setMyWithdrawals(refreshed || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit withdrawal';
      toast('error', message);
    } finally {
      setSubmitting(false);
    }
  }, [availableBalance, currency, hasBankDetails, rawAmount, toast]);

  const setQuickAmount = (ratio: number | 'all') => {
    const base = availableBalance || 0;
    const value = ratio === 'all' ? base : Math.max(0, base * ratio);
    const rounded = Math.round(value * 100) / 100;
    setRawAmount(rounded);
    setDisplayAmount(formatWithCommas(rounded));
  };

  return (
    <div className="w-full mx-auto">
      {showToast && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
          <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Withdrawals</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">View your balance and request payouts</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow-md p-4 md:p-6 border-l-4 border-green-500" style={{ borderRadius: '5px' }}>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Net Earnings</h3>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalEarnings)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">After 6% platform fee</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-md p-4 md:p-6 border-l-4 border-yellow-500" style={{ borderRadius: '5px' }}>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pending Requests</h3>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(pendingTotal)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Withdrawals awaiting approval or processing</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-md p-4 md:p-6 border-l-4 border-[#f54502]" style={{ borderRadius: '5px' }}>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Available Balance</h3>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(availableBalance)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Amount you can withdraw now</p>
        </div>
      </div>

      {/* Request Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Request Withdrawal</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter an amount up to your available balance.</p>
        <div className="max-w-sm w-full">
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Amount ({currency})</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={displayAmount}
              onChange={onAmountChange}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              style={{ borderRadius: '5px' }}
              placeholder="0"
            />
            <button
              className="px-4 py-2 text-white bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 disabled:opacity-60 w-full sm:w-auto"
              style={{ borderRadius: '5px' }}
              onClick={submitWithdrawal}
              disabled={submitting}
            >{submitting ? 'Submitting...' : 'Confirm'}</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="px-3 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{ borderRadius: '5px' }}
              onClick={() => setQuickAmount('all')}
            >All</button>
            <button
              type="button"
              className="px-3 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{ borderRadius: '5px' }}
              onClick={() => setQuickAmount(0.5)}
            >50%</button>
            <button
              type="button"
              className="px-3 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{ borderRadius: '5px' }}
              onClick={() => setQuickAmount(0.3)}
            >30%</button>
          </div>
          {availableBalance <= 0 && (
            <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
              Your current earnings are fully covered by the 6% platform fee or pending withdrawals.
            </p>
          )}
          {!hasBankDetails && (
            <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">You need to set up your bank account before requesting withdrawals.</p>
          )}
        </div>
      </div>

      {/* My Withdrawal Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Your Requests</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Status updates appear here.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Currency</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {myWithdrawals.map(w => (
                <tr key={w.id}>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700 dark:text-gray-300">{new Date(w.created_at).toLocaleString()}</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(Number(w.amount))}</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700 dark:text-gray-300">{w.currency}</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm">
                    <span className={`px-2 py-1 rounded text-white ${w.status === 'approved' ? 'bg-green-600' : w.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>{w.status}</span>
                  </td>
                </tr>
              ))}
              {myWithdrawals.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 md:px-6 py-6 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">No withdrawal requests yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-[#f54502]/20 dark:border-[#f54502]/30">
            {/* Decorative gradient header */}
            <div className="bg-gradient-to-r from-[#f54502] to-[#d63a02] p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
              {/* Success Icon */}
              <div className="relative z-10">
                <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white drop-shadow-lg">Request Received! 🎉</h3>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 text-center">
              <div className="mb-4">
                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                  You will get your money in <span className="font-semibold text-[#f54502] dark:text-[#f54502]">1 - 5 business days</span>.
                </p>
                <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                  Sometimes, in less than <span className="font-semibold text-[#f54502] dark:text-[#f54502]">30mins</span> 😉
                </p>
              </div>
              
              {/* Decorative elements */}
              <div className="flex justify-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#f54502] animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-[#f54502] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-[#f54502] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              
              <button
                className="w-full px-6 py-3 text-white font-semibold bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                style={{ borderRadius: '5px' }}
                onClick={() => setShowSuccessModal(false)}
              >
                Got it! 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Setup Popup */}
      {showAccountPopup && (
        <AccountSetupPopup onClose={() => setShowAccountPopup(false)} />
      )}
    </div>
  );
};

export default Withdrawals;


