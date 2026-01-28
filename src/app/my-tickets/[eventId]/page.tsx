"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { BsTicketPerforated, BsQrCode, BsArrowLeft } from "react-icons/bs";
import { formatDateTime } from "@/utils/formatDateTime";
import { formatPrice } from "@/utils/formatPrice";
import Loader from "@/components/ui/loader/Loader";
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

export default function EventTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
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

        // Get orders for the user
        const { data: userOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id")
          .eq("buyer_user_id", session.user.id)
          .eq("status", "paid");

        if (ordersError) {
          console.error("Error fetching orders:", ordersError);
          setError("Failed to load tickets");
          toast("error", "Failed to load your tickets");
          return;
        }

        if (!userOrders || userOrders.length === 0) {
          setTickets([]);
          return;
        }

        const orderIds = userOrders.map((o) => o.id);

        // Fetch tickets for this specific event
        const { data, error: ticketsError } = await supabase
          .from("tickets")
          .select(`
            id,
            ticket_code,
            qr_code_url,
            attendee_name,
            attendee_email,
            price,
            currency,
            validation_status,
            is_scanned,
            created_at,
            order_id,
            event_id,
            ticket_type_id,
            orders!inner(
              id,
              buyer_email,
              buyer_full_name,
              total_amount,
              currency,
              created_at
            ),
            events!inner(
              id,
              title,
              image_url,
              start_time,
              end_time,
              venue,
              city,
              country,
              slug
            ),
            ticket_types!inner(
              name
            )
          `)
          .in("order_id", orderIds)
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });

        if (ticketsError) {
          console.error("Error fetching tickets:", ticketsError);
          setError("Failed to load tickets");
          toast("error", "Failed to load your tickets");
          return;
        }

        // Transform Supabase response to match Ticket interface
        type TicketRow = Omit<Ticket, 'orders' | 'events' | 'ticket_types'> & {
          orders: unknown;
          events: unknown;
          ticket_types: unknown;
        };
        const transformedTickets: Ticket[] = (data || []).map((ticket: TicketRow) => {
          const normalizedOrders = Array.isArray(ticket.orders) ? ticket.orders[0] : ticket.orders;
          const normalizedEvents = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
          const normalizedTicketTypes = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types;
          return {
            ...(ticket as Omit<Ticket, 'orders' | 'events' | 'ticket_types'>),
            orders: normalizedOrders as Ticket['orders'],
            events: normalizedEvents as Ticket['events'],
            ticket_types: normalizedTicketTypes as Ticket['ticket_types'],
          };
        });

        setTickets(transformedTickets);
      } catch (err) {
        console.error("Error:", err);
        setError("An unexpected error occurred");
        toast("error", "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchTickets();
    }
  }, [eventId]);

  const handleViewTicket = (orderId: string) => {
    router.push(`/invoice/${orderId}`);
  };

  const handleViewEvent = (eventSlug: string | null) => {
    if (eventSlug) {
      router.push(`/${eventSlug}/event`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <BsTicketPerforated className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {error}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
          {error === "Please sign in to view your tickets"
            ? "Please sign in to view your purchased tickets"
            : "We couldn&#39;t load your tickets. Please try again later."}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-[#f54502] text-white rounded-xl hover:bg-[#d63a02] transition-colors flex items-center gap-2"
        >
          <BsArrowLeft className="w-4 h-4" />
          Back to My Tickets
        </button>
      </div>
    );
  }

  const event = tickets.length > 0 ? tickets[0].events : null;

  return (
    <div className="space-y-6 p-4">
      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <BsArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {event?.title || "My Tickets"}
        </h1>
        {tickets.length > 0 && (
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            You have {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} for this event
          </p>
        )}
      </div>

      {/* Event Info Card */}
      {event && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 ">
          <div className="flex flex-col md:flex-row">
            {event.image_url && (
              <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
                <Image
                  src={event.image_url}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {event.title}
              </h2>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Date & Time: </span>
                  {formatDateTime(event.start_time, event.end_time)}
                </div>
                {(event.venue || event.city) && (
                  <div>
                    <span className="font-medium">Location: </span>
                    {[event.venue, event.city, event.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>
              {event.slug && (
                <button
                  onClick={() => handleViewEvent(event.slug)}
                  className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-[5px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  View Event Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <BsTicketPerforated className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No tickets found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            We couldn&apos;t find any tickets for this event.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-[5px] bg-[#f54502]/10 text-[#f54502]">
                        <BsTicketPerforated className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {ticket.ticket_types.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Ticket Code: {ticket.ticket_code}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      {ticket.attendee_name && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Attendee: </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {ticket.attendee_name}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Email: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {ticket.attendee_email}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Price: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatPrice(ticket.price, ticket.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status: </span>
                        <span
                          className={`font-semibold ${
                            ticket.validation_status === "valid"
                              ? "text-green-600 dark:text-green-400"
                              : ticket.validation_status === "refunded"
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {ticket.validation_status.charAt(0).toUpperCase() +
                            ticket.validation_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleViewTicket(ticket.orders.id)}
                      className="px-4 py-2 bg-[#f54502] text-white rounded-[5px] hover:bg-[#d63a02] transition-colors flex items-center gap-2 justify-center"
                    >
                      <BsQrCode className="w-4 h-4" />
                      View Ticket
                    </button>
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

