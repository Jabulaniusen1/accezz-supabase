'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Skeleton } from '@/components/ui/Skeleton';
import { FiSearch, FiExternalLink, FiFilter, FiPlus, FiX } from '@/icon-adapters/react-icons/fi';
import Link from 'next/link';

interface TicketRow {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  price: number;
  currency: string;
  validation_status: string;
  is_scanned: boolean;
  created_at: string;
  order_id: string;
  order_status: string;
  event_id: string;
  event_title: string;
  ticket_type_name: string | null;
}

interface EventOption {
  id: string;
  title: string;
  currency?: string;
}

interface TicketTypeOption {
  id: string;
  name: string;
  price: number;
  currency: string;
}

type TicketOrderRelation = {
  id: string;
  status: string;
  event_id: string | null;
};

type TicketTypeRelation = {
  name: string | null;
};

type TicketEventRelation = {
  id: string;
  title: string;
};

interface TicketQueryRow {
  id: string;
  ticket_code: string;
  attendee_name: string | null;
  attendee_email: string | null;
  price: number | string | null;
  currency: string | null;
  validation_status: string | null;
  is_scanned: boolean | null;
  created_at: string;
  order_id: string;
  event_id: string;
  orders?: TicketOrderRelation | TicketOrderRelation[] | null;
  ticket_types?: TicketTypeRelation | TicketTypeRelation[] | null;
  events?: TicketEventRelation | TicketEventRelation[] | null;
}

interface GenerateForm {
  eventId: string;
  ticketTypeId: string;
  attendeeName: string;
  attendeeEmail: string;
  gender: string;
  sendEmail: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  valid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  invalid: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  refunded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  revoked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Generate ticket modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateForm>({
    eventId: '', ticketTypeId: '', attendeeName: '', attendeeEmail: '', gender: '', sendEmail: true,
  });
  const [ticketTypeOptions, setTicketTypeOptions] = useState<TicketTypeOption[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all events for the filter dropdown
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, currency')
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Build tickets query with order and event info
      let query = supabase
        .from('tickets')
        .select(`
          id,
          ticket_code,
          attendee_name,
          attendee_email,
          price,
          currency,
          validation_status,
          is_scanned,
          created_at,
          order_id,
          orders!inner(id, status, event_id),
          ticket_types(name),
          events!inner(id, title)
        `)
        .order('created_at', { ascending: false });

      if (selectedEventId !== 'all') {
        query = query.eq('event_id', selectedEventId);
      }

      const { data: ticketsData, error: ticketsError } = await query;
      if (ticketsError) throw ticketsError;

      const rows: TicketRow[] = (ticketsData as TicketQueryRow[] | null || []).map((t) => {
        const order = Array.isArray(t.orders) ? t.orders[0] : t.orders;
        const event = Array.isArray(t.events) ? t.events[0] : t.events;
        const ticketType = Array.isArray(t.ticket_types) ? t.ticket_types[0] : t.ticket_types;

        return {
        id: t.id,
        ticket_code: t.ticket_code,
        attendee_name: t.attendee_name,
        attendee_email: t.attendee_email,
        price: Number(t.price || 0),
        currency: t.currency || 'NGN',
        validation_status: t.validation_status || 'valid',
        is_scanned: Boolean(t.is_scanned),
        created_at: t.created_at,
        order_id: order?.id ?? t.order_id,
        order_status: order?.status ?? 'unknown',
        event_id: event?.id ?? t.event_id,
        event_title: event?.title ?? 'Unknown Event',
        ticket_type_name: ticketType?.name ?? null,
      };
      });

      setTickets(rows);
    } catch (e: unknown) {
      console.error('AdminTickets error:', e);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch ticket types when event changes in the modal
  useEffect(() => {
    if (!generateForm.eventId) { setTicketTypeOptions([]); return; }
    supabase
      .from('ticket_types')
      .select('id, name, price')
      .eq('event_id', generateForm.eventId)
      .then(({ data, error }) => {
        if (error) { console.error('[AdminTickets] ticket types fetch error:', error); return; }
        const eventCurrency = events.find(e => e.id === generateForm.eventId)?.currency ?? 'NGN';
        setTicketTypeOptions((data || []).map(t => ({
          id: t.id, name: t.name, price: Number(t.price || 0), currency: eventCurrency,
        })));
        setGenerateForm(f => ({ ...f, ticketTypeId: '' }));
      });
  }, [generateForm.eventId, events]);

  const handleGenerate = useCallback(async () => {
    setGenerateError(null);
    setGenerateSuccess(null);
    if (!generateForm.eventId || !generateForm.ticketTypeId || !generateForm.attendeeName || !generateForm.attendeeEmail) {
      setGenerateError('Please fill in all required fields.');
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/generate-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          eventId: generateForm.eventId,
          ticketTypeId: generateForm.ticketTypeId,
          attendeeName: generateForm.attendeeName,
          attendeeEmail: generateForm.attendeeEmail,
          gender: generateForm.gender || null,
          sendEmail: generateForm.sendEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setGenerateError(json.error || 'Failed to generate ticket'); return; }
      setGenerateSuccess(`Ticket generated! Code: ${json.ticketCode}`);
      fetchData();
    } catch {
      setGenerateError('Unexpected error. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [generateForm, fetchData]);

  const closeModal = useCallback(() => {
    setShowGenerateModal(false);
    setGenerateForm({ eventId: '', ticketTypeId: '', attendeeName: '', attendeeEmail: '', gender: '', sendEmail: true });
    setGenerateError(null);
    setGenerateSuccess(null);
  }, []);

  const filtered = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticket_code.toLowerCase().includes(q) ||
      (t.attendee_name?.toLowerCase().includes(q) ?? false) ||
      (t.attendee_email?.toLowerCase().includes(q) ?? false) ||
      t.event_title.toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((sum, t) => sum + t.price, 0);
  const currencySymbol = filtered[0]?.currency === 'USD' ? '$' : '₦';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Skeleton height="32px" width="200px" className="mb-4" />
          <div className="flex gap-4">
            <Skeleton height="40px" className="flex-1" />
            <Skeleton height="40px" width="200px" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height="48px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generate Ticket Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Generate Ticket</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {generateError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {generateError}
                </div>
              )}
              {generateSuccess && (
                <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 font-mono">
                  {generateSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Event *</label>
                <select
                  value={generateForm.eventId}
                  onChange={e => setGenerateForm(f => ({ ...f, eventId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
                >
                  <option value="">Select an event…</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ticket Type *</label>
                <select
                  value={generateForm.ticketTypeId}
                  onChange={e => setGenerateForm(f => ({ ...f, ticketTypeId: e.target.value }))}
                  disabled={!generateForm.eventId}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent disabled:opacity-50"
                >
                  <option value="">Select ticket type…</option>
                  {ticketTypeOptions.map(tt => (
                    <option key={tt.id} value={tt.id}>{tt.name} — {tt.currency === 'USD' ? '$' : '₦'}{tt.price.toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Attendee Name *</label>
                <input
                  type="text"
                  value={generateForm.attendeeName}
                  onChange={e => setGenerateForm(f => ({ ...f, attendeeName: e.target.value }))}
                  placeholder="Full name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Attendee Email *</label>
                <input
                  type="email"
                  value={generateForm.attendeeEmail}
                  onChange={e => setGenerateForm(f => ({ ...f, attendeeEmail: e.target.value }))}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender (optional)</label>
                <select
                  value={generateForm.gender}
                  onChange={e => setGenerateForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setGenerateForm(f => ({ ...f, sendEmail: !f.sendEmail }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors ${generateForm.sendEmail ? 'bg-[#f54502]' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${generateForm.sendEmail ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">Send ticket email to attendee</span>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 py-2.5 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                ) : 'Generate Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets Sold</h2>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold transition"
          >
            <FiPlus size={15} /> Generate Ticket
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticket code, attendee name, or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
            />
          </div>

          {/* Event Filter */}
          <div className="relative sm:w-64">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent appearance-none"
            >
              <option value="all">All Events</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-900 dark:text-white">{filtered.length}</strong> ticket{filtered.length !== 1 ? 's' : ''}
          </span>
          <span>
            Total value: <strong className="text-gray-900 dark:text-white">
              {currencySymbol}{totalRevenue.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Ticket Code', 'Attendee', 'Event', 'Type', 'Price', 'Status', 'Scanned', 'Purchased', 'Invoice'].map(h => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No tickets found
                  </td>
                </tr>
              ) : (
                filtered.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {ticket.ticket_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {ticket.attendee_name || '—'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {ticket.attendee_email || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[180px]">
                      <div className="text-sm text-gray-900 dark:text-white truncate" title={ticket.event_title}>
                        {ticket.event_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {ticket.ticket_type_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.currency === 'USD' ? '$' : '₦'}{ticket.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.validation_status] ?? STATUS_COLORS.invalid}`}>
                        {ticket.validation_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.is_scanned ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          Scanned
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Not yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(ticket.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/invoice/${ticket.order_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[#f54502] hover:text-[#d63a02] text-sm font-medium transition-colors"
                        title="View Invoice"
                      >
                        Invoice <FiExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTickets;
