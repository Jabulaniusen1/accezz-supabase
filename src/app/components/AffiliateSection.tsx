'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import {
  Copy, Check, ExternalLink, TrendingUp, Users, DollarSign,
  Link2, ChevronDown, ChevronUp, Settings2, Zap,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface AffiliateRow {
  id: string;
  affiliate_code: string;
  clicks: number;
  conversions: number;
  total_earned: number;
  created_at: string;
  event: { id: string; title: string; slug: string; image_url: string | null; start_time: string | null };
  affiliate_settings: { commission_type: string; commission_value: number } | null;
}

interface AffiliateBaseRow {
  id: string;
  affiliate_code: string;
  clicks: number;
  conversions: number;
  total_earned: number;
  created_at: string;
  event: { id: string; title: string; slug: string; image_url: string | null; start_time: string | null } | null;
}

interface CreatorEvent {
  id: string;
  title: string;
  slug: string;
  start_time: string | null;
  affiliate_settings: { enabled: boolean; commission_type: string; commission_value: number } | null;
}

interface AvailableEvent {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  start_time: string | null;
  affiliate_settings: { commission_type: string; commission_value: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function commissionLabel(type: string, value: number) {
  return type === 'percentage' ? `${value}% per sale` : `₦${value.toLocaleString()} per sale`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition flex-shrink-0 ${
        copied
          ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#f54502]/50 hover:text-[#f54502]'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

const AffiliateSection: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'creator' | 'customer' | null>(null);

  const [myAffiliates, setMyAffiliates] = useState<AffiliateRow[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(true);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [creatorEvents, setCreatorEvents] = useState<CreatorEvent[]>([]);
  const [showCreatorSettings, setShowCreatorSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      setToken(session.access_token);
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('user_id', session.user.id).single();
      setUserType((profile?.user_type as 'creator' | 'customer') || 'customer');
    })();
  }, []);

  const loadMyAffiliates = useCallback(async (showLoader = true) => {
    if (!userId) return;
    if (showLoader) setAffiliatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, affiliate_code, clicks, conversions, total_earned, created_at, event:events(id, title, slug, image_url, start_time)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const baseRows = (data as unknown as AffiliateBaseRow[]) || [];
      const eventIds = baseRows.map(r => r.event?.id).filter((id): id is string => Boolean(id));
      const settingsMap = new Map<string, { commission_type: string; commission_value: number }>();
      if (eventIds.length > 0) {
        const { data: settingsRows } = await supabase.from('affiliate_settings').select('event_id, commission_type, commission_value').in('event_id', eventIds);
        for (const row of settingsRows || []) settingsMap.set(row.event_id, row);
      }

      setMyAffiliates(
        baseRows
          .filter((r): r is AffiliateBaseRow & { event: NonNullable<AffiliateBaseRow['event']> } => Boolean(r.event))
          .map(r => ({ ...r, event: r.event, affiliate_settings: settingsMap.get(r.event.id) ?? null }))
      );
    } catch {
      showToast('error', 'Could not load affiliate links.');
    } finally {
      if (showLoader) setAffiliatesLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => { if (userId) loadMyAffiliates(true); }, [userId, loadMyAffiliates]);

  const loadAvailableEvents = useCallback(async () => {
    if (!userId) return;
    setAvailableLoading(true);
    try {
      const joined = new Set(myAffiliates.map(a => a.event.id));
      const { data: settings } = await supabase.from('affiliate_settings').select('commission_type, commission_value, event:events(id, title, slug, image_url, start_time, user_id)').eq('enabled', true);
      if (!settings) return;
      setAvailableEvents(
        (settings as unknown as { commission_type: string; commission_value: number; event: { id: string; title: string; slug: string; image_url: string | null; start_time: string | null; user_id: string } }[])
          .filter(s => s.event && s.event.user_id !== userId && !joined.has(s.event.id))
          .map(s => ({ id: s.event.id, title: s.event.title, slug: s.event.slug, image_url: s.event.image_url, start_time: s.event.start_time, affiliate_settings: { commission_type: s.commission_type, commission_value: s.commission_value } }))
      );
    } finally {
      setAvailableLoading(false);
    }
  }, [userId, myAffiliates]);

  // Auto-load available events once the user's own affiliates have finished loading
  useEffect(() => {
    if (userId && !affiliatesLoading) loadAvailableEvents();
  }, [userId, affiliatesLoading, loadAvailableEvents]);

  const loadCreatorEvents = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('events').select('id, title, slug, start_time, affiliate_settings(enabled, commission_type, commission_value)').eq('user_id', userId).order('created_at', { ascending: false });
    setCreatorEvents((data as unknown as CreatorEvent[]) || []);
  }, [userId]);

  useEffect(() => { if (showCreatorSettings && userType === 'creator') loadCreatorEvents(); }, [showCreatorSettings, userType, loadCreatorEvents]);

  const handleJoin = async (eventId: string) => {
    if (!token) return;
    setJoining(eventId);
    try {
      const res = await fetch('/api/affiliates/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ eventId }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      showToast('success', 'Joined! Your affiliate link is ready.');
      await loadMyAffiliates(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(null);
    }
  };

  const handleSaveSettings = async (eventId: string, enabled: boolean, commissionType: string, commissionValue: number) => {
    if (!token) return;
    setSavingSettings(eventId);
    try {
      const res = await fetch('/api/affiliates/update-settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ eventId, enabled, commissionType, commissionValue }) });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      showToast('success', 'Settings saved.');
      loadCreatorEvents();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingSettings(null);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://accezzlive.com';

  // Totals
  const totalEarned = myAffiliates.reduce((s, a) => s + a.total_earned, 0);
  const totalClicks = myAffiliates.reduce((s, a) => s + a.clicks, 0);
  const totalSales = myAffiliates.reduce((s, a) => s + a.conversions, 0);

  if (affiliatesLoading) {
    return (
      <div className="space-y-3 py-6">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Summary bar ── */}
      {myAffiliates.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Earned', value: `₦${totalEarned.toLocaleString()}`, icon: DollarSign, color: 'text-[#f54502]', bg: 'bg-[#f54502]/8 dark:bg-[#f54502]/10' },
            { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Conversions', value: totalSales.toLocaleString(), icon: Users, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${bg} mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-base font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── My Affiliate Links ── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">My Affiliate Links</h3>

        {myAffiliates.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
              <Link2 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No affiliate links yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Pick an event below to start earning commissions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myAffiliates.map(aff => {
              const link = `${baseUrl}/${aff.event.slug}?ref=${aff.affiliate_code}`;
              const cr = aff.clicks > 0 ? ((aff.conversions / aff.clicks) * 100).toFixed(1) : '0';
              return (
                <div key={aff.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{aff.event.title}</p>
                      {aff.affiliate_settings && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-[#f54502]">
                          <Zap className="w-3 h-3" />
                          {commissionLabel(aff.affiliate_settings.commission_type, aff.affiliate_settings.commission_value)}
                        </span>
                      )}
                    </div>
                    <a
                      href={`/${aff.event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-[#f54502] hover:border-[#f54502]/40 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Link row */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="flex-1 min-w-0 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{link}</p>
                      <CopyButton text={link} />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="border-t border-gray-100 dark:border-gray-700 grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700">
                    {[
                      { label: 'Clicks', value: aff.clicks.toLocaleString() },
                      { label: 'Sales', value: aff.conversions.toLocaleString() },
                      { label: 'Conv.', value: `${cr}%` },
                      { label: 'Earned', value: `₦${aff.total_earned.toLocaleString()}`, highlight: true },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} className="py-3 flex flex-col items-center gap-0.5">
                        <p className={`text-sm font-bold ${highlight ? 'text-[#f54502]' : 'text-gray-800 dark:text-gray-200'}`}>{value}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Browse events to promote ── */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Events to Promote</h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {availableLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
            </div>
          ) : availableEvents.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No events available to promote right now.</p>
          ) : (
            availableEvents.map(ev => (
              <div key={ev.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                  <p className="text-xs text-[#f54502] mt-0.5">
                    {commissionLabel(ev.affiliate_settings.commission_type, ev.affiliate_settings.commission_value)}
                  </p>
                </div>
                <button
                  onClick={() => handleJoin(ev.id)}
                  disabled={joining === ev.id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#f54502] hover:bg-[#d63a02] text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {joining === ev.id ? (
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {joining === ev.id ? 'Joining…' : 'Get link'}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Creator: manage affiliate settings ── */}
      {userType === 'creator' && (
        <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowCreatorSettings(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition text-left"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Settings2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Manage Affiliate Programs</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Set commissions for your events</p>
            </div>
            {showCreatorSettings ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </button>

          {showCreatorSettings && (
            <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 bg-gray-50 dark:bg-gray-900/50">
              {creatorEvents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No events found.</p>
              ) : (
                creatorEvents.map(ev => (
                  <CreatorEventSettings
                    key={ev.id}
                    event={ev}
                    saving={savingSettings === ev.id}
                    onSave={(enabled, commissionType, commissionValue) => handleSaveSettings(ev.id, enabled, commissionType, commissionValue)}
                  />
                ))
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

// ── Per-event affiliate settings ───────────────────────────────────────────

function CreatorEventSettings({ event, saving, onSave }: {
  event: CreatorEvent;
  saving: boolean;
  onSave: (enabled: boolean, commissionType: string, commissionValue: number) => void;
}) {
  const [enabled, setEnabled] = useState(event.affiliate_settings?.enabled ?? false);
  const [commissionType, setCommissionType] = useState(event.affiliate_settings?.commission_type ?? 'percentage');
  const [commissionValue, setCommissionValue] = useState(event.affiliate_settings?.commission_value ?? 10);
  const [dirty, setDirty] = useState(false);

  const update = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-800 dark:text-white truncate pr-4">{event.title}</p>
        <button
          type="button"
          onClick={() => { setEnabled(v => !v); setDirty(true); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-[#f54502]' : 'bg-gray-300 dark:bg-gray-600'}`}
          aria-label="Toggle affiliate"
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Commission Type</label>
            <select
              value={commissionType}
              onChange={e => update(setCommissionType)(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f54502]/30"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₦)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              {commissionType === 'percentage' ? 'Rate (%)' : 'Amount (₦)'}
            </label>
            <input
              type="number"
              min={0}
              value={commissionValue}
              onChange={e => update(setCommissionValue)(Number(e.target.value))}
              className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f54502]/30"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => { onSave(enabled, commissionType, commissionValue); setDirty(false); }}
        disabled={saving || !dirty}
        className="w-full py-2 text-xs font-semibold rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-1.5 bg-[#f54502] hover:bg-[#d63a02] text-white disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400"
      >
        {saving ? (
          <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
        ) : 'Save Settings'}
      </button>
    </div>
  );
}

export default AffiliateSection;
