'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { FiCheck, FiTrash2, FiMapPin } from '@/icon-adapters/react-icons/fi';

type Location = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
};

type Tab = 'pending' | 'approved';

type ActionState = Record<string, 'approving' | 'rejecting' | null>;

export default function AdminLocations() {
  const [tab, setTab] = useState<Tab>('pending');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionState, setActionState] = useState<ActionState>({});
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`/api/admin/locations?status=${tab}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const json = await res.json();
      setLocations(json.locations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const callAction = async (locationId: string, method: 'PATCH' | 'DELETE', stateKey: 'approving' | 'rejecting') => {
    setActionState(s => ({ ...s, [locationId]: stateKey }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch('/api/admin/locations', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ locationId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setLocations(prev => prev.filter(l => l.id !== locationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionState(s => ({ ...s, [locationId]: null }));
    }
  };

  const approve = (id: string) => callAction(id, 'PATCH', 'approving');
  const reject = (id: string) => callAction(id, 'DELETE', 'rejecting');

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Locations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review venues submitted by event organisers
          </p>
        </div>
        <button
          onClick={fetchLocations}
          disabled={loading}
          className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {(['pending', 'approved'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-72" />
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiMapPin size={36} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No {tab} locations
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {tab === 'pending'
              ? 'Submitted venues will appear here for review.'
              : 'Approved locations will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map(loc => (
            <div
              key={loc.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-start gap-4"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <FiMapPin size={18} className="text-[#f54502]" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{loc.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {[loc.address, loc.city, loc.country].filter(Boolean).join(', ')}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Submitted {formatDate(loc.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {tab === 'pending' && (
                  <button
                    onClick={() => approve(loc.id)}
                    disabled={!!actionState[loc.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiCheck size={14} />
                    {actionState[loc.id] === 'approving' ? 'Approving…' : 'Approve'}
                  </button>
                )}
                <button
                  onClick={() => reject(loc.id)}
                  disabled={!!actionState[loc.id]}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiTrash2 size={14} />
                  {actionState[loc.id] === 'rejecting' ? 'Deleting…' : tab === 'pending' ? 'Reject' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
