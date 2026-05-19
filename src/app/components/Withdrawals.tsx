'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { notifyWithdrawalRequest } from '@/utils/notificationClient';
import AccountSetupPopup from './AccountSetupPopup';
import type { WithdrawalRequest, WithdrawalSource } from '@/types/withdrawal';
import { Toast } from './Toast';

type EventRow = { id: string; created_at: string };
const AFFILIATE_WITHDRAWAL_FEE_NGN = 100;
const PAYOUT_CURRENCY = 'NGN';



const Withdrawals: React.FC = () => {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string }>({ type: 'success', message: '' });
  const [userType, setUserType] = useState<'creator' | 'customer'>('customer');
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

  const loadWalletContext = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_number, bank_code, bank_name, currency, user_type')
        .eq('user_id', session.user.id)
        .maybeSingle();
      const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
      const ok = hasText(profile?.account_number) && (hasText(profile?.bank_code) || hasText(profile?.bank_name));
      setHasBankDetails(ok);
      if (profile?.currency) setCurrency(profile.currency);
      setUserType((profile?.user_type as 'creator' | 'customer') || 'customer');

      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setMyWithdrawals(withdrawals || []);
    } catch (err) {
      console.error('[Withdrawals] loadWalletContext error:', err);
    }
  }, []);

  // Format helpers
  const formatCurrency = useCallback((amount: number, currencyCode?: string) => {
    if (isNaN(amount)) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currencyCode || currency || 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
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

  // Load user's events
  const { data: events } = useQuery<EventRow[]>({
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
      return (evs || []) as EventRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Compute total revenue from ticket_types.sold × price (same method as Earning.tsx)
  const { data: totalEarnings } = useQuery<number>({
    queryKey: ['withdrawalsTotalEarnings', (events || []).map(e => e.id)],
    enabled: !!events && events.length > 0,
    queryFn: async () => {
      const eventIds = (events || []).map(e => e.id);
      if (!eventIds.length) return 0;
      const { data: ticketTypes } = await supabase
        .from('ticket_types')
        .select('price, sold')
        .in('event_id', eventIds);
      return (ticketTypes || []).reduce((sum, tt) => {
        const price = Number(tt.price || 0);
        const sold = Number(tt.sold || 0);
        return sum + (Number.isFinite(price) && Number.isFinite(sold) ? price * sold : 0);
      }, 0);
    },
    staleTime: 60_000
  });

  useEffect(() => {
    loadWalletContext();
  }, [loadWalletContext]);

  // Affiliate commissions earned by this user
  const { data: affiliateEarnings } = useQuery<number>({
    queryKey: ['affiliateEarnings', userType],
    enabled: userType !== 'creator',
    queryFn: async () => {
      if (userType === 'creator') return 0;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return 0;
      const { data } = await supabase
        .from('affiliate_commissions')
        .select('amount')
        .eq('user_id', session.user.id);
      return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    },
    staleTime: 60_000,
  });

  const pendingTotal = useMemo(() => {
    const pendingStatuses = new Set(['pending', 'processing']);
    return myWithdrawals
      .filter(w => pendingStatuses.has((w.status || '').toLowerCase()))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  }, [myWithdrawals]);

  // const approvedTotal = useMemo(() => {
  //   const approvedStatuses = new Set(['approved', 'completed', 'paid']);
  //   return myWithdrawals
  //     .filter(w => approvedStatuses.has((w.status || '').toLowerCase()))
  //     .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  // }, [myWithdrawals]);

  // Total withdrawn amount (all withdrawals that have been processed or are pending)
  // This includes both approved/completed/paid AND pending/processing withdrawals
  const totalWithdrawn = useMemo(() => {
    // Include all withdrawals except rejected ones (as they don't actually deduct balance)
    const excludedStatuses = new Set(['rejected']);
    return myWithdrawals
      .filter(w => !excludedStatuses.has((w.status || '').toLowerCase()))
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  }, [myWithdrawals]);

  // Block new requests if there is any unapproved (pending/processing) request
  const hasPendingRequest = useMemo(() => {
    const pendingStatuses = new Set(['pending', 'processing']);
    return myWithdrawals.some(w => pendingStatuses.has((w.status || '').toLowerCase()));
  }, [myWithdrawals]);

  const isCreator = userType === 'creator';

  // Available balance is role-based:
  // - creators: event earnings only
  // - normal affiliates: affiliate earnings only
  const availableBalance = useMemo(
    () => Math.max(0, (isCreator ? (totalEarnings || 0) : (affiliateEarnings || 0)) - totalWithdrawn),
    [affiliateEarnings, isCreator, totalEarnings, totalWithdrawn]
  );

  const isAffiliateSource = !isCreator;
  const maxRequestable = availableBalance;
  const appliedFee = isAffiliateSource ? AFFILIATE_WITHDRAWAL_FEE_NGN : 0;
  const payoutCurrency = isAffiliateSource ? PAYOUT_CURRENCY : (currency || PAYOUT_CURRENCY);
  const netPayoutPreview = Math.max(0, (rawAmount || 0) - appliedFee);

  const submitWithdrawal = useCallback(async () => {
    if (hasPendingRequest) {
      toast('warning', 'You already have a pending withdrawal request. Please wait until it is approved.');
      return;
    }
    if (hasBankDetails === null) {
      toast('info', 'Loading your account details, please try again in a moment.');
      return;
    }
    if (!hasBankDetails) {
      setShowAccountPopup(true);
      return;
    }
    const amountNum = rawAmount ?? 0;
    if (!amountNum || amountNum <= 0) {
      toast('warning', 'Enter a valid amount');
      return;
    }
    if (isAffiliateSource && amountNum <= AFFILIATE_WITHDRAWAL_FEE_NGN) {
      toast('warning', `Amount must be above ${formatCurrency(AFFILIATE_WITHDRAWAL_FEE_NGN, PAYOUT_CURRENCY)} to cover withdrawal fee.`);
      return;
    }
    if (amountNum > maxRequestable) {
      toast('warning', isAffiliateSource ? 'Amount exceeds affiliate withdrawable balance' : 'Amount exceeds available balance');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const source: WithdrawalSource = isAffiliateSource ? 'affiliate' : 'event';
      const feeAmount = isAffiliateSource ? AFFILIATE_WITHDRAWAL_FEE_NGN : 0;
      const netAmount = amountNum - feeAmount;
      const { data: inserted, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: session.user.id,
          amount: amountNum,
          currency: payoutCurrency,
          source,
          fee_amount: feeAmount,
          net_amount: netAmount,
        })
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
      await loadWalletContext();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit withdrawal';
      toast('error', message);
    } finally {
      setSubmitting(false);
    }
  }, [formatCurrency, hasBankDetails, hasPendingRequest, isAffiliateSource, loadWalletContext, maxRequestable, payoutCurrency, rawAmount, toast]);

  const setQuickAmount = (ratio: number | 'all') => {
    const base = maxRequestable || 0;
    const value = ratio === 'all' ? base : Math.max(0, base * ratio);
    const rounded = Math.round(value * 100) / 100;
    setRawAmount(rounded);
    setDisplayAmount(formatWithCommas(rounded));
  };

  return (
    <div className="w-full mx-auto space-y-6">
      {showToast && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
          <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />
        </div>
      )}

      {/* ── Balance Hero Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f54502] to-[#c03800] p-6 text-white shadow-lg shadow-[#f54502]/20">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-8 -translate-x-6" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
            {isAffiliateSource ? 'Affiliate Balance' : 'Event Earnings'}
          </p>
          <p className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(maxRequestable, payoutCurrency)}</p>
          <div className="flex flex-wrap gap-4 border-t border-white/20 pt-4">
            <div>
              <p className="text-xs text-white/60">Pending</p>
              <p className="text-sm font-semibold">{formatCurrency(pendingTotal, payoutCurrency)}</p>
            </div>
            {isAffiliateSource && (
              <>
                <div>
                  <p className="text-xs text-white/60">Withdrawal Fee</p>
                  <p className="text-sm font-semibold">{formatCurrency(AFFILIATE_WITHDRAWAL_FEE_NGN, PAYOUT_CURRENCY)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60">You Receive</p>
                  <p className="text-sm font-semibold">{formatCurrency(netPayoutPreview, PAYOUT_CURRENCY)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Request Withdrawal Card ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            {isAffiliateSource ? 'Withdraw Affiliate Earnings' : 'Withdraw Event Earnings'}
          </h3>
          {isAffiliateSource && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Fixed fee of {formatCurrency(AFFILIATE_WITHDRAWAL_FEE_NGN, PAYOUT_CURRENCY)} per request
            </p>
          )}
        </div>
        <div className="p-5">
          {/* Warnings */}
          {(hasPendingRequest || availableBalance <= 0 || !hasBankDetails || (isAffiliateSource && maxRequestable <= AFFILIATE_WITHDRAWAL_FEE_NGN)) && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 space-y-1">
              {hasPendingRequest && <p>You have a pending request. Wait until it is processed before submitting a new one.</p>}
              {!hasBankDetails && <p>Set up your bank account before requesting a withdrawal.</p>}
              {availableBalance <= 0 && !hasPendingRequest && <p>You have no available balance to withdraw.</p>}
              {isAffiliateSource && maxRequestable <= AFFILIATE_WITHDRAWAL_FEE_NGN && maxRequestable > 0 && <p>Balance must exceed the {formatCurrency(AFFILIATE_WITHDRAWAL_FEE_NGN, PAYOUT_CURRENCY)} fee to withdraw.</p>}
            </div>
          )}

          {/* Amount input */}
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Amount ({payoutCurrency})</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              inputMode="decimal"
              value={displayAmount}
              onChange={onAmountChange}
              placeholder="0.00"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#f54502]/30 focus:border-[#f54502] transition"
            />
            <button
              onClick={submitWithdrawal}
              disabled={submitting || hasPendingRequest || maxRequestable <= appliedFee}
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[#f54502] hover:bg-[#d63a02] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 whitespace-nowrap"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {submitting ? 'Submitting…' : hasPendingRequest ? 'Pending' : 'Request'}
            </button>
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2 mb-4">
            {([['All', 'all'], ['50%', 0.5], ['30%', 0.3]] as [string, 'all' | number][]).map(([label, ratio]) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuickAmount(ratio)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#f54502]/50 hover:text-[#f54502] transition"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Fee breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Fee</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(appliedFee, payoutCurrency)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#f54502]/5 dark:bg-[#f54502]/10 border border-[#f54502]/20">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">You Receive</p>
              <p className="text-sm font-bold text-[#f54502]">{formatCurrency(netPayoutPreview, payoutCurrency)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Withdrawal History ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Withdrawal History</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{myWithdrawals.length} request{myWithdrawals.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {myWithdrawals.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">No withdrawal requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {myWithdrawals.map(w => {
              const isApproved = w.status === 'approved' || w.status === 'completed';
              const isRejected = w.status === 'rejected';
              return (
                <div key={w.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isApproved ? 'bg-green-50 dark:bg-green-900/20' : isRejected ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                    <svg className={`w-5 h-5 ${isApproved ? 'text-green-500' : isRejected ? 'text-red-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isApproved
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        : isRejected
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(w.amount), w.currency || PAYOUT_CURRENCY)}</p>
                      <span className="text-xs text-gray-400">→ net {formatCurrency(Number(w.net_amount ?? (Number(w.amount) - Number(w.fee_amount || 0))), w.currency || PAYOUT_CURRENCY)}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date(w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · <span className="capitalize">{w.source || 'combined'}</span></p>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${isApproved ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : isRejected ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                    {w.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
                {isAffiliateSource && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    A withdrawal fee of {formatCurrency(AFFILIATE_WITHDRAWAL_FEE_NGN, PAYOUT_CURRENCY)} has been applied.
                  </p>
                )}
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
        <AccountSetupPopup
          onClose={() => setShowAccountPopup(false)}
          onSetupComplete={() => {
            setHasBankDetails(true);
            setShowAccountPopup(false);
          }}
        />
      )}
    </div>
  );
};

export default Withdrawals;
