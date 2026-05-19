'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { notifyWithdrawalApproved } from '@/utils/notificationClient';
import type { WithdrawalRequest, WithdrawalStatus } from '@/types/withdrawal';

type Row = WithdrawalRequest & {
  user_email?: string | null;
  full_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  bank_name?: string | null;
  bank_code?: string | null;
};

const AdminWithdrawals: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<WithdrawalStatus | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: withdrawals, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, account_name, account_number, bank_name, bank_code');

      type ProfileData = {
        user_id: string;
        full_name?: string | null;
        account_name?: string | null;
        account_number?: string | null;
        bank_name?: string | null;
        bank_code?: string | null;
      };

      const profileMap = new Map<string, ProfileData>();
      (profiles || []).forEach(p => profileMap.set(p.user_id, p));

      // Fetch emails via admin API
      const userIds = Array.from(new Set((withdrawals || []).map(w => w.user_id)));
      let emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const emailResponse = await fetch('/api/admin/users-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ user_ids: userIds }),
        });
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          emailMap = new Map(emailData.emails || []);
        }
      }

      const withProfile: Row[] = (withdrawals || []).map(w => ({
        ...w,
        user_email: emailMap.get(w.user_id) ?? null,
        full_name: profileMap.get(w.user_id)?.full_name ?? null,
        account_name: profileMap.get(w.user_id)?.account_name ?? null,
        account_number: profileMap.get(w.user_id)?.account_number ?? null,
        bank_name: profileMap.get(w.user_id)?.bank_name ?? null,
        bank_code: profileMap.get(w.user_id)?.bank_code ?? null,
      }));

      setRows(withProfile);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: WithdrawalStatus) => {
    setUpdatingId(id);
    try {
      const payload: Partial<WithdrawalRequest> = {
        status,
        resolved_at: status === 'approved' || status === 'rejected' ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from('withdrawal_requests')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      if (status === 'approved') {
        await notifyWithdrawalApproved(id);
      }
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = rows.filter(r => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Withdrawal Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Approve or reject user withdrawals</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            value={filter}
            onChange={(e) => setFilter(e.target.value as WithdrawalStatus | 'all')}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={load}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >Refresh</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Net Payout</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Currency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading && (
              <tr><td colSpan={11} className="px-6 py-6 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={11} className="px-6 py-6 text-center text-gray-500 dark:text-gray-400">No requests</td></tr>
            )}
            {visible.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  <div className="font-medium">{r.full_name || 'No name'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{r.user_email || r.user_id.slice(0, 8)}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{r.source || 'combined'}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{Number(r.amount).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{Number(r.fee_amount || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {Number(r.net_amount ?? (Number(r.amount || 0) - Number(r.fee_amount || 0))).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.currency}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.bank_name || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.account_name ? `${r.account_name} • ${r.account_number}` : '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-white ${r.status === 'approved' ? 'bg-green-600' : r.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>{r.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={updatingId === r.id || r.status !== 'pending'}
                      onClick={() => updateStatus(r.id, 'approved')}
                      className="px-3 py-2 rounded text-white bg-green-600 disabled:opacity-50"
                    >{updatingId === r.id ? '...' : 'Resolve'}</button>
                    <button
                      disabled={updatingId === r.id || r.status !== 'pending'}
                      onClick={() => updateStatus(r.id, 'rejected')}
                      className="px-3 py-2 rounded text-white bg-red-600 disabled:opacity-50"
                    >Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminWithdrawals;

