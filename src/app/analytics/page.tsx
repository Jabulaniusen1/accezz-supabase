'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { Event, Ticket } from '@/types/analytics';
import { PageSkeleton } from '@/components/ui/Skeleton';
import Toast from '@/components/ui/Toast';
import { AnalyticsHeader } from './components/AnalyticsHeader';
import { Filters } from './components/Filters';
import { AttendeesTable } from './components/AttendeesTable';
import { EmailMarketing } from './components/EmailMarketing';
import { Ticket as TicketIcon, CircleDollarSign, ScanLine, Users } from 'lucide-react';

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  </div>
);

// ─── Main analytics content ───────────────────────────────────────────────────
const EventAnalyticsContent = () => {
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');

  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('');
  const [scannedFilter, setScannedFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [emailTitle, setEmailTitle] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [activeTab, setActiveTab] = useState<'attendees' | 'email'>('attendees');

  // ── Fetch event ──────────────────────────────────────────────────────────────
  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .select('id, slug, title, description, image_url, start_time, end_time, location, address, city')
        .eq('id', eventId)
        .single();
      if (evErr) throw evErr;

      const { data: types, error: ttErr } = await supabase
        .from('ticket_types')
        .select('id, name, price, quantity, sold')
        .eq('event_id', eventId);
      if (ttErr) throw ttErr;

      const e: Event = {
        id: ev.id,
        slug: ev.slug || ev.id,
        title: ev.title,
        description: ev.description,
        image: ev.image_url,
        date: ev.start_time,
        location: ev.location || ev.address || ev.city || '',
        ticketType: (types || []).map((t) => ({
          name: t.name,
          sold: String(t.sold ?? '0'),
          price: String(t.price ?? '0'),
          quantity: String(t.quantity ?? '0'),
        })),
      };
      setEvent(e);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load event details.' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // ── Fetch tickets ────────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const { data: tix, error: tErr } = await supabase
        .from('tickets')
        .select(
          'id, order_id, ticket_type_id, attendee_name, attendee_email, price, currency, created_at, is_scanned, validation_status, qr_code_url'
        )
        .eq('event_id', eventId);
      if (tErr) throw tErr;

      const typeIds = Array.from(new Set((tix || []).map((t) => t.ticket_type_id)));
      const { data: typeRows } = await supabase
        .from('ticket_types')
        .select('id, name')
        .in('id', typeIds.length ? typeIds : ['00000000-0000-0000-0000-000000000000']);
      const typeMap = new Map<string, string>(
        (typeRows || []).map((r) => [r.id as string, r.name as string])
      );

      // Infer names for orphaned ticket types
      const orphanedTypeIds = typeIds.filter((id) => !typeMap.has(id));
      if (orphanedTypeIds.length > 0) {
        const orphaned = (tix || []).filter((t) => orphanedTypeIds.includes(t.ticket_type_id as string));
        const groups = new Map<string, { price: number; currency: string }>();
        orphaned.forEach((t) => {
          const id = t.ticket_type_id as string;
          const price = Number(t.price || 0);
          const cur = (t.currency as string) || 'NGN';
          if (!groups.has(id)) groups.set(id, { price, currency: cur });
          else if (price > 0 && groups.get(id)!.price === 0) {
            groups.get(id)!.price = price;
            groups.get(id)!.currency = cur;
          }
        });
        groups.forEach((g, id) => {
          if (!typeMap.has(id)) {
            typeMap.set(id, g.price > 0 ? `${g.currency} ${g.price.toFixed(2)} (Recovered)` : 'Free Ticket (Recovered)');
          }
        });
      }

      const orderIds = Array.from(new Set((tix || []).map((t) => t.order_id)));
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, payment_reference, currency')
        .in('id', orderIds.length ? orderIds : ['00000000-0000-0000-0000-000000000000']);
      type OrderRow = { id: string; status: string; payment_reference?: string | null; currency?: string | null };
      const orderMap = new Map<string, OrderRow>(
        (orders || []).map((o) => [o.id as string, o as OrderRow])
      );

      const mapped: Ticket[] = (tix || []).map((t) => {
        const o = orderMap.get(t.order_id as string);
        return {
          id: t.id as string,
          eventId: eventId,
          email: (t.attendee_email as string) || '',
          phone: '',
          fullName: (t.attendee_name as string) || '',
          ticketType: typeMap.get(t.ticket_type_id as string) || '',
          price: Number(t.price || 0),
          purchaseDate: t.created_at as string,
          qrCode: (t.qr_code_url as string) || '',
          paid: o ? o.status === 'paid' : false,
          currency: (t.currency as string) || (o?.currency as string) || '',
          flwRef: (o?.payment_reference as string) || '',
          attendees: [],
          validationStatus: (t.validation_status as string) || 'valid',
          isScanned: !!t.is_scanned,
          createdAt: t.created_at as string,
          updatedAt: t.created_at as string,
        };
      });

      const valid = mapped.filter((t) => t.validationStatus === 'valid');
      setTickets(mapped);
      setFilteredTickets(valid);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load ticket details.';
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // ── Email handler ─────────────────────────────────────────────────────────────
  const handleSendEmail = useCallback(async () => {
    if (!emailTitle.trim() || !emailContent.trim()) {
      setToast({ type: 'error', message: 'Subject and message cannot be empty.' });
      return;
    }
    const recipients = Array.from(
      new Set(
        filteredTickets
          .flatMap((t) => [t.email, ...t.attendees.map((a) => a.email)])
          .filter(Boolean)
      )
    ) as string[];
    if (!recipients.length) {
      setToast({ type: 'error', message: 'No valid email recipients found.' });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: emailTitle, content: emailContent, recipients }),
      });
      if (!res.ok) throw new Error();
      setToast({ type: 'success', message: `Sent to ${recipients.length} recipients.` });
      setEmailTitle('');
      setEmailContent('');
    } catch {
      setToast({
        type: 'error',
        message: 'Upgrade to premium before sending emails to attendees.',
      });
    } finally {
      setLoading(false);
    }
  }, [emailTitle, emailContent, filteredTickets]);

  // ── Share handler ─────────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    if (!event) return;
    const url = `${window.location.origin}/${event.slug}`;
    if (navigator.share) {
      navigator.share({ title: event.title, text: `Check out: ${event.title}`, url });
    } else {
      navigator.clipboard
        ?.writeText(url)
        .then(() => setToast({ type: 'success', message: 'Link copied to clipboard!' }))
        .catch(() => setToast({ type: 'error', message: 'Failed to copy link' }));
    }
  }, [event]);

  // ── Filter effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredTickets(
      tickets.filter((t) => {
        if (t.validationStatus !== 'valid') return false;
        if (q && !t.fullName.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q)) return false;
        if (ticketTypeFilter && t.ticketType !== ticketTypeFilter) return false;
        if (scannedFilter === 'scanned' && !t.isScanned) return false;
        if (scannedFilter === 'not_scanned' && t.isScanned) return false;
        if (paymentFilter === 'paid' && !t.paid) return false;
        if (paymentFilter === 'unpaid' && t.paid) return false;
        return true;
      })
    );
  }, [tickets, searchQuery, ticketTypeFilter, scannedFilter, paymentFilter]);

  useEffect(() => {
    fetchEvent();
    fetchTickets();
  }, [fetchEvent, fetchTickets]);

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const paidValid = useMemo(
    () => tickets.filter((t) => t.paid && t.validationStatus === 'valid'),
    [tickets]
  );
  const totalSold = paidValid.length;
  const totalRevenue = useMemo(
    () => paidValid.reduce((s, t) => s + (Number.isFinite(t.price) ? t.price : 0), 0),
    [paidValid]
  );
  const checkedIn = useMemo(() => paidValid.filter((t) => t.isScanned).length, [paidValid]);
  const totalCapacity = useMemo(
    () => event?.ticketType.reduce((s, t) => s + parseInt(t.quantity || '0'), 0) ?? 0,
    [event]
  );
  const remaining = totalCapacity - totalSold;

  // ── Format currency ───────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  if (loading && !event) return <PageSkeleton />;
  if (!event) return (
    <div className="flex items-center justify-center h-screen text-sm text-gray-500 dark:text-gray-400">
      Event not found
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      <AnalyticsHeader
        title={event.title}
        onShare={handleShare}
        eventDate={event.date}
        totalPaidAttendees={totalSold}
        totalRevenue={totalRevenue}
        currency="NGN"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stat cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Tickets sold"
            value={totalSold}
            icon={TicketIcon}
            accent="bg-[#f54502]/10 text-[#f54502]"
          />
          <StatCard
            label="Revenue"
            value={fmt(totalRevenue)}
            icon={CircleDollarSign}
            accent="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          />
          <StatCard
            label="Checked in"
            value={checkedIn}
            icon={ScanLine}
            accent="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Remaining"
            value={remaining > 0 ? remaining : 0}
            icon={Users}
            accent="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
        </div>

        {/* ── Ticket type breakdown ────────────────────────────────────────────── */}
        {event.ticketType.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Ticket types</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {event.ticketType.map((t) => {
                const sold = parseInt(t.sold || '0');
                const qty = parseInt(t.quantity || '0');
                const pct = qty > 0 ? Math.min(100, Math.round((sold / qty) * 100)) : 0;
                return (
                  <div key={t.name} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-800 dark:text-white">{t.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {sold} / {qty}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#f54502] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Attendees / Email tabs ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {(['attendees', 'email'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'border-[#f54502] text-[#f54502]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'attendees' ? `Attendees (${filteredTickets.length})` : 'Email attendees'}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {activeTab === 'attendees' ? (
              <div className="space-y-4">
                <Filters
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  ticketTypeFilter={ticketTypeFilter}
                  setTicketTypeFilter={setTicketTypeFilter}
                  scannedFilter={scannedFilter}
                  setScannedFilter={setScannedFilter}
                  paymentFilter={paymentFilter}
                  setPaymentFilter={setPaymentFilter}
                  ticketTypes={event.ticketType}
                  onReset={() => {
                    setSearchQuery('');
                    setTicketTypeFilter('');
                    setScannedFilter('');
                    setPaymentFilter('');
                  }}
                />
                <AttendeesTable tickets={filteredTickets} />
              </div>
            ) : (
              <EmailMarketing
                emailTitle={emailTitle}
                setEmailTitle={setEmailTitle}
                emailContent={emailContent}
                setEmailContent={setEmailContent}
                onSendEmail={handleSendEmail}
              />
            )}
          </div>
        </div>

        {/* ── Premium upsell ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#f54502] uppercase tracking-wide mb-1">
                Premium — Early Access
              </p>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Unlock advanced analytics
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send bulk emails, export attendee CSVs, view demographic insights, and get priority support.
              </p>
            </div>
            <a
              href="mailto:support@accezzlive.com?subject=Premium%20Analytics%20Interest"
              className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-medium transition whitespace-nowrap"
            >
              Get early access
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────
const AnalyticsPage = () => (
  <Suspense fallback={<PageSkeleton />}>
    <EventAnalyticsContent />
  </Suspense>
);

export default AnalyticsPage;
