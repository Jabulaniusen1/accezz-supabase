"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { BsTicketPerforated, BsQrCode, BsArrowLeft } from "react-icons/bs";
import { FiSend, FiX, FiCopy, FiCheck, FiArrowDownLeft } from "react-icons/fi";
import { Link2 } from "lucide-react";
import { formatDateTime } from "@/utils/formatDateTime";
import { formatPrice } from "@/utils/formatPrice";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";

interface Ticket {
  id: string;
  ticket_code: string;
  qr_code_url: string | null;
  attendee_name: string | null;
  attendee_email: string;
  price: number;
  currency: string;
  validation_status: string;
  is_scanned: boolean;
  created_at: string;
  owner_user_id: string | null;
  orders: {
    id: string;
    buyer_email: string;
    buyer_full_name: string | null;
    total_amount: number;
    currency: string;
    created_at: string;
  };
  events: {
    id: string;
    title: string;
    image_url: string | null;
    start_time: string;
    end_time: string | null;
    venue: string | null;
    city: string | null;
    country: string | null;
    slug: string | null;
  };
  ticket_types: { name: string };
}

interface AffiliateInfo {
  link: string;
  commissionType: string;
  commissionValue: number;
}

// ── Transfer Modal ───────────────────────────────────────────────────────────

function TransferModal({
  ticket,
  token,
  onClose,
  onSuccess,
}: {
  ticket: Ticket;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = async () => {
    if (!email.trim()) { setError('Enter the recipient email'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticketId: ticket.id, recipientEmail: email.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transfer Ticket</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FiX size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium text-gray-900 dark:text-white">{ticket.ticket_types.name}</span>
          {' · Code: '}<span className="font-mono">{ticket.ticket_code}</span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enter the email address of the person you want to transfer this ticket to.
          They must have an Accezz account.
        </p>

        <input
          type="email"
          placeholder="recipient@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleTransfer()}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent mb-3"
        />

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiSend size={14} />
            {loading ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Affiliate Link Card ─────────────────────────────────────────────────────

function AffiliateLinkCard({ eventId, eventSlug }: { eventId: string; eventSlug: string | null }) {
  const [info, setInfo] = useState<AffiliateInfo | null>(null);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setToken(session.access_token);

      const { data: settings } = await supabase
        .from('affiliate_settings')
        .select('enabled, commission_type, commission_value')
        .eq('event_id', eventId)
        .eq('enabled', true)
        .maybeSingle();

      if (!settings) { setLoading(false); return; }
      setAvailable(true);

      const { data: existing } = await supabase
        .from('affiliates')
        .select('affiliate_code')
        .eq('user_id', session.user.id)
        .eq('event_id', eventId)
        .maybeSingle();

      if (existing) {
        const baseUrl = window.location.origin;
        setInfo({
          link: `${baseUrl}/${eventSlug}?ref=${existing.affiliate_code}`,
          commissionType: settings.commission_type,
          commissionValue: settings.commission_value,
        });
      }
      setLoading(false);
    })();
  }, [eventId, eventSlug]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await fetch('/api/affiliates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json() as { affiliateLink?: string; commissionType?: string; commissionValue?: number; error?: string };
      if (!res.ok) throw new Error(data.error);
      setInfo({ link: data.affiliateLink!, commissionType: data.commissionType!, commissionValue: data.commissionValue! });
    } catch {
      // non-critical
    } finally {
      setJoining(false);
    }
  };

  const handleCopy = () => {
    if (!info) return;
    navigator.clipboard.writeText(info.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading || !available) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-[#f54502]" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Affiliate Link</h3>
      </div>

      {info ? (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Earn{' '}
            {info.commissionType === 'percentage'
              ? `${info.commissionValue}%`
              : `₦${info.commissionValue.toLocaleString()}`}{' '}
            on every ticket sold through your link.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">{info.link}</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-[#f54502] hover:border-[#f54502]/40 transition flex-shrink-0"
            >
              {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            This event has an affiliate program. Get your unique link and earn a commission on every ticket sold.
          </p>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-4 py-2 bg-[#f54502] hover:bg-[#d63a02] text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
          >
            {joining ? 'Getting link…' : 'Get my affiliate link'}
          </button>
        </>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function EventTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [transferMap, setTransferMap] = useState<Map<string, { from_email: string; transferred_at: string }>>(new Map());

  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string }>({ type: 'success', message: '' });

  const showToastMsg = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const normalize = (rows: unknown[]) =>
    (rows as Record<string, unknown>[]).map(t => ({
      ...t,
      orders: Array.isArray(t.orders) ? t.orders[0] : t.orders,
      events: Array.isArray(t.events) ? t.events[0] : t.events,
      ticket_types: Array.isArray(t.ticket_types) ? t.ticket_types[0] : t.ticket_types,
    })) as Ticket[];

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to view your tickets'); return; }
      setToken(session.access_token);

      const selectFields = `
        id, ticket_code, qr_code_url, attendee_name, attendee_email,
        price, currency, validation_status, is_scanned, created_at, owner_user_id,
        order_id, event_id, ticket_type_id,
        orders!inner(id, buyer_email, buyer_full_name, total_amount, currency, created_at),
        events!inner(id, title, image_url, start_time, end_time, venue, city, country, slug),
        ticket_types!inner(name)
      `;

      // Fetch paid orders owned by this user
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('buyer_user_id', session.user.id)
        .eq('status', 'paid');

      const orderIds = (userOrders || []).map(o => o.id);

      // Run both queries in parallel
      const [byOrder, byOwner] = await Promise.all([
        orderIds.length
          ? supabase.from('tickets').select(selectFields).in('order_id', orderIds).eq('event_id', eventId)
          : Promise.resolve({ data: [] as unknown[], error: null }),
        supabase.from('tickets').select(selectFields).eq('owner_user_id', session.user.id).eq('event_id', eventId),
      ]);

      // Merge and deduplicate
      const seen = new Set<string>();
      const all: Ticket[] = [];
      for (const t of [...normalize((byOrder.data as unknown[]) || []), ...normalize((byOwner.data as unknown[]) || [])]) {
        if (!seen.has(t.id)) { seen.add(t.id); all.push(t); }
      }

      // Exclude tickets the user transferred away (owner changed to someone else)
      const mine = all.filter(t => !t.owner_user_id || t.owner_user_id === session.user.id);
      mine.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setTickets(mine);

      // Fetch transfer history for tickets received by this user
      if (mine.length > 0) {
        const { data: transfers } = await supabase
          .from('ticket_transfers')
          .select('ticket_id, from_email, transferred_at')
          .in('ticket_id', mine.map(t => t.id))
          .eq('to_user_id', session.user.id)
          .order('transferred_at', { ascending: false });

        const tMap = new Map<string, { from_email: string; transferred_at: string }>();
        (transfers || []).forEach(tr => {
          if (!tMap.has(tr.ticket_id)) tMap.set(tr.ticket_id, tr);
        });
        setTransferMap(tMap);
      }

      // Check affiliate program
      if (all.length > 0) {
        const { data: aff } = await supabase
          .from('affiliate_settings')
          .select('enabled')
          .eq('event_id', eventId)
          .maybeSingle();
        setAffiliateEnabled(aff?.enabled === true);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred');
      showToastMsg('error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleTransferSuccess = () => {
    setTransferTicket(null);
    showToastMsg('success', 'Ticket transferred successfully!');
    fetchTickets();
  };

  if (loading) return <PageSkeleton />;

  if (error && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <BsTicketPerforated className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{error}</h3>
        <button onClick={() => router.push('/dashboard')} className="mt-4 px-6 py-3 bg-[#f54502] text-white rounded-xl hover:bg-[#d63a02] transition flex items-center gap-2">
          <BsArrowLeft className="w-4 h-4" /> Back to My Tickets
        </button>
      </div>
    );
  }

  const event = tickets.length > 0 ? tickets[0].events : null;

  return (
    <div className="space-y-6 p-4">
      {showToast && (
        <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />
      )}

      {transferTicket && token && (
        <TransferModal
          ticket={transferTicket}
          token={token}
          onClose={() => setTransferTicket(null)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* Back + Title */}
      <div className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <BsArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {event?.title || 'My Tickets'}
        </h1>
        {tickets.length > 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
          </p>
        )}
      </div>

      {/* Event Info */}
      {event && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-2">
          <div className="flex flex-col md:flex-row">
            {event.image_url && (
              <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
                <Image src={event.image_url} alt={event.title} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{event.title}</h2>
              <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">Date & Time: </span>{formatDateTime(event.start_time, event.end_time)}</p>
                {(event.venue || event.city) && (
                  <p><span className="font-medium">Location: </span>{[event.venue, event.city, event.country].filter(Boolean).join(', ')}</p>
                )}
              </div>
              {event.slug && (
                <button
                  onClick={() => router.push(`/${event.slug}/event`)}
                  className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-[5px] hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
                >
                  View Event Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Link */}
      {affiliateEnabled && event && (
        <AffiliateLinkCard eventId={eventId} eventSlug={event.slug} />
      )}

      {/* Tickets */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 bg-white dark:bg-gray-800 rounded-xl">
          <BsTicketPerforated className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No tickets found</h3>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-[5px] bg-[#f54502]/10 text-[#f54502]">
                        <BsTicketPerforated className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{ticket.ticket_types.name}</h3>
                          {transferMap.has(ticket.id) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                              <FiArrowDownLeft className="w-3 h-3" />
                              Received
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">#{ticket.ticket_code}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm mb-4">
                      {ticket.attendee_name && (
                        <p><span className="text-gray-500 dark:text-gray-400">Attendee: </span><span className="font-medium text-gray-900 dark:text-white">{ticket.attendee_name}</span></p>
                      )}
                      <p><span className="text-gray-500 dark:text-gray-400">Email: </span><span className="font-medium text-gray-900 dark:text-white">{ticket.attendee_email}</span></p>
                      <p><span className="text-gray-500 dark:text-gray-400">Price: </span><span className="font-semibold text-gray-900 dark:text-white">{formatPrice(ticket.price, ticket.currency)}</span></p>
                      <p>
                        <span className="text-gray-500 dark:text-gray-400">Status: </span>
                        <span className={`font-semibold ${ticket.validation_status === 'valid' ? 'text-green-600 dark:text-green-400' : ticket.validation_status === 'refunded' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {ticket.validation_status.charAt(0).toUpperCase() + ticket.validation_status.slice(1)}
                          {ticket.is_scanned && ' · Used'}
                        </span>
                      </p>
                      {transferMap.has(ticket.id) && (() => {
                        const tr = transferMap.get(ticket.id)!;
                        return (
                          <p className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <FiArrowDownLeft className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Transferred from <span className="font-medium">{tr.from_email}</span></span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">· {new Date(tr.transferred_at).toLocaleDateString()}</span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={() => router.push(`/invoice/${ticket.orders.id}`)}
                      className="px-4 py-2 bg-[#f54502] text-white rounded-[5px] hover:bg-[#d63a02] transition flex items-center gap-2 justify-center text-sm font-medium"
                    >
                      <BsQrCode className="w-4 h-4" /> View Ticket
                    </button>
                    {ticket.validation_status === 'valid' && !ticket.is_scanned && (
                      <button
                        onClick={() => setTransferTicket(ticket)}
                        className="px-4 py-2 border border-[#f54502] text-[#f54502] rounded-[5px] hover:bg-[#f54502]/5 transition flex items-center gap-2 justify-center text-sm font-medium"
                      >
                        <FiSend className="w-4 h-4" /> Transfer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
