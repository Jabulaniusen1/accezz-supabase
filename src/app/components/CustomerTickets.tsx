"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BsTicketPerforated } from "react-icons/bs";
import { FiArrowDownLeft } from "react-icons/fi";
import { ChevronRightIcon } from "lucide-react";
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
  ticket_types: {
    name: string;
  };
}

interface GroupedEvent {
  eventId: string;
  eventTitle: string;
  eventImage: string | null;
  eventSlug: string | null;
  ticketCount: number;
  tickets: Ticket[];
  hasTransferred: boolean;
}

export default function CustomerTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transferredTicketIds, setTransferredTicketIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  }>({
    type: "success",
    message: "",
  });
  const router = useRouter();

  const toast = (
    type: "success" | "error" | "warning" | "info",
    message: string
  ) => {
    setToastProps({ type, message });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError("Please sign in to view your tickets");
          return;
        }

        const selectFields = `
          id, ticket_code, qr_code_url, attendee_name, attendee_email,
          price, currency, validation_status, is_scanned, created_at,
          owner_user_id, order_id, event_id, ticket_type_id,
          orders!inner(id, buyer_email, buyer_full_name, total_amount, currency, created_at),
          events!inner(id, title, image_url, start_time, end_time, venue, city, country, slug),
          ticket_types!inner(name)
        `;

        // Get paid order IDs for this user
        const { data: userOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("buyer_user_id", session.user.id)
          .eq("status", "paid");

        const orderIds = (userOrders || []).map((o) => o.id);

        // Query both: original purchases (by order) and received transfers (by owner)
        const [byOrderRes, byOwnerRes] = await Promise.all([
          orderIds.length
            ? supabase.from("tickets").select(selectFields).in("order_id", orderIds)
            : Promise.resolve({ data: [] as unknown[], error: null }),
          supabase.from("tickets").select(selectFields).eq("owner_user_id", session.user.id),
        ]);

        if (byOrderRes.error) {
          console.error("Error fetching tickets by order:", byOrderRes.error);
          setError("Failed to load tickets");
          toast("error", "Failed to load your tickets");
          return;
        }

        type TicketRow = Omit<Ticket, 'orders' | 'events' | 'ticket_types'> & {
          orders: unknown; events: unknown; ticket_types: unknown;
        };
        const normalize = (rows: unknown[]) =>
          (rows as TicketRow[]).map(t => ({
            ...t,
            orders: Array.isArray(t.orders) ? t.orders[0] : t.orders,
            events: Array.isArray(t.events) ? t.events[0] : t.events,
            ticket_types: Array.isArray(t.ticket_types) ? t.ticket_types[0] : t.ticket_types,
          })) as Ticket[];

        // Merge + deduplicate
        const seen = new Set<string>();
        const all: Ticket[] = [];
        for (const t of [...normalize(byOrderRes.data || []), ...normalize(byOwnerRes.data || [])]) {
          if (!seen.has(t.id)) { seen.add(t.id); all.push(t); }
        }

        // Exclude tickets the user transferred away (owner changed to someone else)
        const mine = all.filter(t => !t.owner_user_id || t.owner_user_id === session.user.id);
        mine.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setTickets(mine);

        // Fetch which tickets were received via transfer
        if (mine.length > 0) {
          const { data: transfers } = await supabase
            .from('ticket_transfers')
            .select('ticket_id')
            .in('ticket_id', mine.map(t => t.id))
            .eq('to_user_id', session.user.id);
          setTransferredTicketIds(new Set((transfers || []).map(tr => tr.ticket_id)));
        }
      } catch (err) {
        console.error("Error:", err);
        setError("An unexpected error occurred");
        toast("error", "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Group tickets by event
  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, GroupedEvent>();

    tickets.forEach((ticket) => {
      const eventId = ticket.events.id;
      if (grouped.has(eventId)) {
        const existing = grouped.get(eventId)!;
        existing.ticketCount += 1;
        existing.tickets.push(ticket);
        if (transferredTicketIds.has(ticket.id)) existing.hasTransferred = true;
      } else {
        grouped.set(eventId, {
          eventId,
          eventTitle: ticket.events.title,
          eventImage: ticket.events.image_url,
          eventSlug: ticket.events.slug,
          ticketCount: 1,
          tickets: [ticket],
          hasTransferred: transferredTicketIds.has(ticket.id),
        });
      }
    });

    return Array.from(grouped.values());
  }, [tickets, transferredTicketIds]);

  const totalTickets = tickets.length;
  const totalEvents = groupedEvents.length;

  const handleEventClick = (eventSlug: string | null, eventId: string) => {
    // Navigate to the ticket details page for this event
    router.push(`/my-tickets/${eventId}`);
  };

  if (loading) return <PageSkeleton />;

  if (error && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <BsTicketPerforated className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {error}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          {error === "Please sign in to view your tickets"
            ? "Please sign in to view your purchased tickets"
            : "We couldn&#39;t load your tickets. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My tickets
        </h1>
        {totalTickets > 0 && (
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            You have {totalTickets} {totalTickets === 1 ? "ticket" : "tickets"}, for {totalEvents} {totalEvents === 1 ? "event" : "events"}
          </p>
        )}
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <BsTicketPerforated className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No tickets yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            You haven&apos;t purchased any tickets yet. Start exploring events to find something you&apos;d like to attend!
          </p>
          <button
            onClick={() => router.push("/events")}
            className="px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Browse Events
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedEvents.map((groupedEvent) => (
            <div
              key={groupedEvent.eventId}
              onClick={() => handleEventClick(groupedEvent.eventSlug, groupedEvent.eventId)}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors active:scale-[0.98]"
            >
              {/* Event Image - Circular/Rounded Square */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                {groupedEvent.eventImage ? (
                  <Image
                    src={groupedEvent.eventImage}
                    alt={groupedEvent.eventTitle}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BsTicketPerforated className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {groupedEvent.eventTitle}
                  </h3>
                  {groupedEvent.hasTransferred && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 flex-shrink-0">
                      <FiArrowDownLeft className="w-3 h-3" />
                      Received
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You have {groupedEvent.ticketCount} {groupedEvent.ticketCount === 1 ? "ticket" : "tickets"} for this event
                </p>
              </div>

              {/* Right Arrow */}
              <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

