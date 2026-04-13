'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/utils/supabaseClient';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { CheckCircle2, Download, Calendar, MapPin, Ticket } from 'lucide-react';
import jsPDF from 'jspdf';

interface Order {
  id: string;
  buyer_full_name: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  total_amount: number;
  currency: string | null;
  status: string;
  payment_reference: string | null;
  created_at: string;
  meta: {
    ticketTypeName?: string;
    quantity?: number;
    attendees?: Array<{ name: string; email: string; gender?: string }>;
  } | null;
}

interface Ticket {
  id: string;
  ticket_code: string;
  qr_code_url: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  price: number;
  currency: string | null;
}

interface Event {
  id: string;
  title: string;
  image_url: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_virtual: boolean;
  virtual_details: Record<string, unknown> | null;
}

const InvoiceContent = () => {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        if (!invoiceId) {
          throw new Error('Invoice ID is required');
        }

        // Fetch order with event details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            events (
              id,
              title,
              image_url,
              start_time,
              end_time,
              venue,
              address,
              city,
              country,
              is_virtual,
              virtual_details
            )
          `)
          .eq('id', invoiceId)
          .single();

        if (orderError || !orderData) {
          throw new Error(orderError?.message || 'Order not found');
        }

        const orderWithEvents = orderData as Order & { events: Event };
        setOrder(orderWithEvents);
        setEvent(orderWithEvents.events);

        // Fetch tickets for this order
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .eq('order_id', invoiceId)
          .order('created_at', { ascending: true });

        if (ticketsError) {
          throw new Error(ticketsError.message);
        }

        const ticketsList = ticketsData as Ticket[] || [];
        setTickets(ticketsList);

        // If no tickets yet (order paid or still processing), poll until they appear
        if (ticketsList.length === 0 && (orderWithEvents.status === 'paid' || orderWithEvents.status === 'pending')) {
          let attempts = 0;
          const maxAttempts = 10;
          const poll = async () => {
            if (attempts >= maxAttempts) return;
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
            const { data: retryTickets } = await supabase
              .from('tickets')
              .select('*')
              .eq('order_id', invoiceId)
              .order('created_at', { ascending: true });
            if (retryTickets && retryTickets.length > 0) {
              setTickets(retryTickets as Ticket[]);
            } else {
              poll();
            }
          };
          poll();
        }

        // Generate QR codes for tickets that don't have them
        const qrPromises = ticketsList.map(async (ticket) => {
          if (ticket.qr_code_url) {
            return { ticketId: ticket.id, qrCode: ticket.qr_code_url };
          }
          
          // Generate fallback QR code
          try {
            const QRCodeLib = await import('qrcode').then(m => m.default);
            const baseUrl = window.location.origin;
            const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticket.ticket_code}`;
            const qrCode = await QRCodeLib.toDataURL(validateUrl, { width: 200, margin: 1 });
            return { ticketId: ticket.id, qrCode };
          } catch {
            const baseUrl = window.location.origin;
            const encodedUrl = encodeURIComponent(`${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticket.ticket_code}`);
            return {
              ticketId: ticket.id,
              qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`
            };
          }
        });

        const qrResults = await Promise.all(qrPromises);
        const qrMap: Record<string, string> = {};
        qrResults.forEach(({ ticketId, qrCode }) => {
          qrMap[ticketId] = qrCode;
        });
        setQrCodes(qrMap);

        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching invoice:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [invoiceId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string | null) => {
    const currencySymbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency || '₦';
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const downloadPDF = async () => {
    if (!order || !event || tickets.length === 0) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const qrSize = 30; // Size of QR code in PDF
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(245, 69, 2);
      doc.text('Invoice', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Invoice #: ${order.id.substring(0, 8)}`, margin, yPos);
      yPos += 5;
      doc.text(`Date: ${formatDate(order.created_at)}`, margin, yPos);
      yPos += 10;

      // Order details
      doc.setFontSize(14);
      doc.text('Order Details', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Customer: ${order.buyer_full_name || 'N/A'}`, margin, yPos);
      yPos += 5;
      doc.text(`Email: ${order.buyer_email}`, margin, yPos);
      yPos += 5;
      if (order.buyer_phone) {
        doc.text(`Phone: ${order.buyer_phone}`, margin, yPos);
        yPos += 5;
      }
      yPos += 5;

      // Event details
      doc.setFontSize(14);
      doc.text('Event', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Event: ${event.title}`, margin, yPos);
      yPos += 5;
      if (event.start_time) {
        doc.text(`Date: ${formatDate(event.start_time)}`, margin, yPos);
        yPos += 5;
        const startTime = formatTime(event.start_time);
        const endTime = formatTime(event.end_time);
        if (startTime) {
          doc.text(`Time: ${startTime}${endTime ? ` - ${endTime}` : ''}`, margin, yPos);
          yPos += 5;
        }
      }
      yPos += 5;

      // Tickets
      doc.setFontSize(14);
      doc.text('Tickets', margin, yPos);
      yPos += 8;

      // Process tickets and add QR codes
      for (let index = 0; index < tickets.length; index++) {
        const ticket = tickets[index];
        
        // Check if we need a new page
        if (yPos + qrSize + 20 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPos = margin;
        }

        // Get QR code for this ticket
        let qrCodeDataUrl = qrCodes[ticket.id];
        if (!qrCodeDataUrl) {
          // Generate QR code if not available
          try {
            const QRCodeLib = await import('qrcode').then(m => m.default);
            const baseUrl = window.location.origin;
            const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticket.ticket_code}`;
            qrCodeDataUrl = await QRCodeLib.toDataURL(validateUrl, { width: 200, margin: 1 });
          } catch {
            const baseUrl = window.location.origin;
            const encodedUrl = encodeURIComponent(`${baseUrl}/validate-ticket?ticketId=${ticket.id}&signature=${ticket.ticket_code}`);
            qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
          }
        }

        // Ticket information on the left
        const ticketStartY = yPos;
        doc.setFontSize(10);
        doc.text(`Ticket ${index + 1}: ${ticket.attendee_name || 'N/A'}`, margin, yPos);
        yPos += 5;
        doc.text(`Code: ${ticket.ticket_code}`, margin, yPos);
        yPos += 5;
        doc.text(`Price: ${formatCurrency(ticket.price, ticket.currency)}`, margin, yPos);
        
        // QR code on the right
        try {
          // Convert data URL to image and add to PDF
          if (qrCodeDataUrl.startsWith('data:image')) {
            // It's a data URL, use it directly
            doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, ticketStartY, qrSize, qrSize);
          } else {
            // It's a URL, fetch and convert
            const response = await fetch(qrCodeDataUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            doc.addImage(dataUrl, 'PNG', pageWidth - margin - qrSize, ticketStartY, qrSize, qrSize);
          }
        } catch (qrError) {
          console.error('Error adding QR code to PDF:', qrError);
          // Continue without QR code if it fails
        }

        yPos += qrSize + 5; // Move down past QR code height
        yPos += 5; // Add spacing between tickets
      }

      // Total
      doc.setFontSize(12);
      doc.text(`Total: ${formatCurrency(order.total_amount, order.currency)}`, margin, yPos);
      yPos += 5;
      doc.text(`Status: ${order.status.toUpperCase()}`, margin, yPos);
      yPos += 10;

      // Powered by Accezz
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Powered by', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.setFontSize(9);
      doc.setTextColor(245, 69, 2);
      doc.text('Accezz', pageWidth / 2, yPos, { align: 'center' });

      doc.save(`invoice-${order.id.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (loading) return <PageSkeleton />;

  if (error || !order || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Invoice not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#f54502] text-white rounded-lg hover:bg-[#d63a02] transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);
  const eventTime = startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime || 'TBD';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-8 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Invoice</h1>
              <p className="text-sm sm:text-base text-gray-600">Invoice #{order.id.substring(0, 8)}</p>
            </div>
            <div className="text-right">
              {order.status === 'paid' && (
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Paid</span>
                </div>
              )}
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="text-sm">
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium">{formatDate(order.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Event Details</h2>
          {event.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <Image
                src={event.image_url}
                alt={event.title}
                width={800}
                height={400}
                className="w-full h-64 object-cover"
              />
            </div>
          )}
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{event.title}</h3>
          <div className="space-y-3">
            {event.start_time && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm">Date & Time</p>
                  <p className="font-medium text-sm sm:text-base">{formatDate(event.start_time)}</p>
                  <p className="text-gray-600 text-sm sm:text-base">{eventTime}</p>
                </div>
              </div>
            )}
            {!event.is_virtual && (event.venue || event.address || event.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm">Venue</p>
                  <p className="font-medium text-sm sm:text-base">
                    {[event.venue, event.address, event.city, event.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
            {event.is_virtual && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-sm">Venue</p>
                  <p className="font-medium">Virtual Event</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details */}
        {/* <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Details</h2>
          <div className="space-y-3">
            {order.buyer_full_name && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-500 text-sm">Name</p>
                  <p className="font-medium">{order.buyer_full_name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-500 text-sm">Email</p>
                <p className="font-medium">{order.buyer_email}</p>
              </div>
            </div>
            {order.buyer_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="font-medium">{order.buyer_phone}</p>
                </div>
              </div>
            )}
          </div>
        </div> */}

        {/* Tickets */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Tickets</h2>
            <span className="text-sm sm:text-base text-gray-600">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
          </div>
          {tickets.length === 0 && (order.status === 'paid' || order.status === 'pending') ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Tickets are being generated...</p>
              <p className="text-sm text-gray-400">Please refresh the page in a moment</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No tickets found for this order</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {tickets.map((ticket, index) => (
              <div key={ticket.id} className="border rounded-lg p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-[#f54502]" />
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                        Ticket {index + 1} - {order.meta?.ticketTypeName || 'General Admission'}
                      </h3>
                    </div>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">Attendee: </span>
                        <span className="font-medium">{ticket.attendee_name || 'N/A'}</span>
                      </div>
                      {ticket.attendee_email && (
                        <div>
                          <span className="text-gray-500">Email: </span>
                          <span className="font-medium truncate max-w-[200px] inline-block align-bottom" title={ticket.attendee_email}>{ticket.attendee_email}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Ticket Code: </span>
                        <span className="font-mono font-medium text-[#f54502]">{ticket.ticket_code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price: </span>
                        <span className="font-medium">{formatCurrency(ticket.price, ticket.currency)}</span>
                      </div>
                    </div>
                  </div>
                    {qrCodes[ticket.id] && (
                      <div className="ml-2 sm:ml-4">
                        <div className="bg-white p-2 rounded border">
                          <Image
                            src={qrCodes[ticket.id]}
                            alt={`QR Code for ${ticket.ticket_code}`}
                            width={80}
                            height={80}
                            className="w-16 h-16 sm:w-20 sm:h-20"
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-1">QR Code</p>
                      </div>
                    )}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.total_amount, order.currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total Tickets</span>
              <span>{tickets.length}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-[#f54502]">{formatCurrency(order.total_amount, order.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Powered by Accezz */}
        <div className="text-center mt-6 mb-4">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold text-[#f54502]">Accezz</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const InvoicePage = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvoiceContent />
    </Suspense>
  );
};

export default InvoicePage;

