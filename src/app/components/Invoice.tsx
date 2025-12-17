'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import TicketLoader from '@/components/ui/loader/ticketLoader';
import ErrorHandler from '@/components/ErrorHandler';
import { supabase } from '@/utils/supabaseClient';
import Logo from '@/components/ui/Logo';

type InvoiceProps = {
  ticketId?: string | null;
  orderId?: string | null;
  autoDownload?: boolean;
};

interface Ticket {
  id: string;
  ticket_code: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  qr_code_url?: string | null;
}

interface OrderData {
  id: string;
  buyer_full_name: string | null;
  buyer_email: string;
  total_amount: number;
  currency: string;
  payment_provider: string | null;
  created_at: string;
  meta?: {
    ticketTypeName?: string;
    quantity?: number;
    attendees?: Array<{ name: string; email: string }>;
  } | null;
}

interface EventData {
  id: string;
  title: string;
  image_url: string | null;
  start_time: string;
  end_time: string | null;
  venue: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  slug: string | null;
}

const Invoice = ({ ticketId, orderId: orderIdProp, autoDownload = false }: InvoiceProps) => {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const hasAutoDownloaded = useRef(false);

  // Fetch invoice data
  const fetchInvoiceData = async () => {
    try {
      let orderId = orderIdProp;

      // If we have ticketId but not orderId, get orderId from ticket
      if (ticketId && !orderId) {
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select('order_id')
          .eq('id', ticketId)
          .single();

        if (ticketError || !ticket) {
          throw new Error('Ticket not found');
        }
        orderId = ticket.order_id;
      }

      if (!orderId) {
        throw new Error('Order ID or Ticket ID is required');
      }

      // Fetch order with event details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_full_name,
          buyer_email,
          total_amount,
          currency,
          payment_provider,
          created_at,
          meta,
          event_id,
          events!inner(
            id,
            title,
            image_url,
            start_time,
            end_time,
            venue,
            location,
            address,
            city,
            country,
            slug
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error('Order not found');
      }

      const eventData = (orderData as any).events as EventData;
      setOrder(orderData as OrderData);
      setEvent(eventData);

      // Fetch all tickets for this order (including attendee info)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, ticket_code, attendee_name, attendee_email, qr_code_url')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (ticketsError) {
        throw ticketsError;
      }

      setTickets(ticketsData || []);

      // Get QR code from first ticket
      if (ticketsData && ticketsData.length > 0) {
        const firstTicket = ticketsData[0];
        if (firstTicket.qr_code_url) {
          setQrCodeUrl(firstTicket.qr_code_url);
        } else {
          // Generate QR code
          const baseUrl = window.location.origin;
          const validateUrl = `${baseUrl}/validate-ticket?ticketId=${firstTicket.id}&signature=${firstTicket.ticket_code}`;
          try {
            const QRCodeLib = await import('qrcode').then(m => m.default);
            const qrDataUrl = await QRCodeLib.toDataURL(validateUrl, { width: 400, margin: 2 });
            setQrCodeUrl(qrDataUrl);
          } catch {
            // Fallback to external service
            const encodedUrl = encodeURIComponent(validateUrl);
            setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedUrl}`);
          }
        }
      }

      setError(null);
    } catch (err: unknown) {
      setError('Failed to load invoice');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [ticketId, orderIdProp]);

  // Helper function to fetch image as base64
  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  };

  // Format date to match design: "Sun, 29th Jun 2025 20:28:21"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[date.getDay()];
    const dayNum = date.getDate();
    const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? 'st' :
                   dayNum === 2 || dayNum === 22 ? 'nd' :
                   dayNum === 3 || dayNum === 23 ? 'rd' : 'th';
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}, ${dayNum}${suffix} ${month} ${year} ${hours}:${minutes}:${seconds}`;
  };

  // Format date for event display (ISO format: 2025-06-29T18:00)
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    // Return ISO string but truncate to remove seconds if at midnight
    const iso = date.toISOString();
    // Return in format: YYYY-MM-DDTHH:mm
    return iso.substring(0, 16);
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <TicketLoader />
      </div>
    );
  }

  if (error || !order || !event) {
    return (
      <ErrorHandler
        error={error || 'Invoice data not available'}
        onClose={() => {}}
        retry={fetchInvoiceData}
      />
    );
  }

  const ticketTypeName = order.meta?.ticketTypeName || 'General';
  // Get actual quantity from order meta (this is the total number of tickets purchased)
  const quantity = order.meta?.quantity || tickets.length || 1;
  // Attendee count is the same as quantity (total tickets purchased)
  const attendeeCount = quantity;
  const pricePerTicket = quantity > 0 ? order.total_amount / quantity : order.total_amount;
  const primaryTicket = tickets[0];
  const buyerName = order.buyer_full_name || order.buyer_email.split('@')[0];
  // Get attendees from order meta or use ticket attendee names
  const attendees = order.meta?.attendees || tickets.map(t => ({
    name: t.attendee_name || buyerName,
    email: t.attendee_email || order.buyer_email
  }));

  // Format ticket code helper (needs event to be available)
  const formatTicketCodeForDisplay = (code: string): string => {
    if (event?.slug) {
      const slugPrefix = event.slug.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (slugPrefix.length >= 4) {
        const codePart = code.substring(0, 10).toUpperCase();
        return `${slugPrefix}${slugPrefix.length === 5 ? '0' : ''}-${codePart}`;
      }
    }
    // Fallback: use first 6 chars + remaining code
    const prefix = code.substring(0, 6).toUpperCase();
    const codePart = code.substring(6, 16).toUpperCase() || code.substring(0, 10).toUpperCase();
    return `${prefix}-${codePart}`;
  };

  // Generate PDF matching the Invoice design with better structure
  const generatePDF = async () => {
    if (!order || !event) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const leftMargin = 15;
    const rightMargin = 15;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let currentY = 0;

    // ==================== HEADER SECTION ====================
    // Header with gray background (bg-gray-300)
    doc.setFillColor(209, 213, 219); // gray-300
    doc.rect(0, 0, pageWidth, 20, 'F');
    currentY = 20;

    // Logo
    try {
      const logoBase64 = await fetchImageAsBase64('/accezzlive cl.png');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', leftMargin, 5, 35, 10);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Accezz', leftMargin, 12);
      }
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Accezz', leftMargin, 12);
    }

    // ==================== TICKET TITLE SECTION ====================
    currentY = 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text('Ticket', leftMargin, currentY);
    currentY += 10;

    // Dashed separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
    currentY += 10;
    doc.setLineDashPattern([], 0);

    // ==================== MAIN CONTENT SECTION (Two Columns) ====================
    // Calculate column widths to fit within content area (180mm = 210 - 15 - 15)
    const columnSpacing = 8;
    const leftColumnWidth = (contentWidth - columnSpacing) * 0.55; // 55% of available width (~95mm)
    const rightColumnWidth = (contentWidth - columnSpacing) * 0.45; // 45% of available width (~78mm)
    const rightColumnX = leftMargin + leftColumnWidth + columnSpacing;
    const sectionStartY = currentY;

    // Left Column: Event Details
    let leftY = currentY;

    // Event Image
    if (event.image_url) {
      try {
        const imageBase64 = await fetchImageAsBase64(event.image_url);
        if (imageBase64) {
          const imgHeight = 45;
          doc.addImage(imageBase64, 'JPEG', leftMargin, leftY, leftColumnWidth, imgHeight);
          leftY += imgHeight + 6;
        }
      } catch (error) {
        console.error('Error loading event image:', error);
      }
    }

    // Event Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    const titleLines = doc.splitTextToSize(event.title, leftColumnWidth);
    doc.text(titleLines, leftMargin, leftY);
    leftY += titleLines.length * 5 + 4;

    // Event Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const eventDate = formatDate(order.created_at);
    doc.text(eventDate, leftMargin, leftY);
    leftY += 5;

    // Venue
    const venue = event.venue || event.address || event.location || event.city || 'Location TBD';
    const venueLines = doc.splitTextToSize(venue, leftColumnWidth);
    doc.text(venueLines, leftMargin, leftY);
    leftY += venueLines.length * 4 + 4;

    // Buyer Name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Attendee: ${buyerName}`, leftMargin, leftY);
    leftY += 5;

    // Ticket Count
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const ticketCountText = `${attendeeCount} ${attendeeCount === 1 ? 'Ticket' : 'Tickets'} Purchased`;
    doc.text(ticketCountText, leftMargin, leftY);
    leftY += 8;

    // Right Column: QR Code
    const qrY = sectionStartY + 15;
    if (qrCodeUrl) {
      try {
        const qrBase64 = await fetchImageAsBase64(qrCodeUrl);
        if (qrBase64) {
          const qrSize = 55;
          const qrX = rightColumnX + (rightColumnWidth - qrSize) / 2;

          // QR Code Background Box
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 2, 2, 'F');
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 2, 2, 'S');

          // QR Code Image
          doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);

          // "Powered by Accezz" text below QR code
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text('Powered by Accezz', rightColumnX + rightColumnWidth / 2, qrY + qrSize + 6, { align: 'center' });
        }
      } catch (error) {
        console.error('Error loading QR code:', error);
      }
    }

    // Update currentY to the bottom of the tallest column
    currentY = Math.max(leftY, qrY + 70) + 8;

    // ==================== SEPARATOR ====================
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
    currentY += 10;
    doc.setLineDashPattern([], 0);

    // ==================== INVOICE SUMMARY SECTION ====================
    // Match the mobile invoice page style: text-base lg:text-lg font-bold text-gray-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14); // text-base equivalent (16px = ~14pt in PDF)
    doc.setTextColor(17, 24, 39); // text-gray-900 (closer to #111827)
    
    // Create total text and ensure it fits within page margins
    const totalText = `Total : ${formatCurrency(order.total_amount, order.currency)}`;
    // Use 70% of content width to ensure it fits and doesn't overflow
    const maxTotalWidth = contentWidth * 0.7;
    const totalLines = doc.splitTextToSize(totalText, maxTotalWidth);
    
    // Right-align the total text - render each line right-aligned
    const lineHeight = 5.5;
    totalLines.forEach((line: string, index: number) => {
      doc.text(line, pageWidth - rightMargin, currentY + (index * lineHeight), { align: 'right' });
    });
    currentY += totalLines.length * lineHeight + 8; // Add proper spacing based on number of lines

    // ==================== TICKET INFORMATION SECTION ====================
    // Section Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('Ticket Information', leftMargin, currentY);
    currentY += 7;

    // Ticket Details in structured format with proper width constraints
    const infoLabelWidth = 28; // Fixed width for labels
    const infoValueWidth = contentWidth - infoLabelWidth - 5; // Remaining width for values
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Ticket Type
    doc.text('Ticket Type:', leftMargin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const ticketTypeLines = doc.splitTextToSize(ticketTypeName, infoValueWidth);
    doc.text(ticketTypeLines, leftMargin + infoLabelWidth, currentY);
    currentY += ticketTypeLines.length * 4 + 3;

    // Ticket ID
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Ticket ID:', leftMargin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const ticketId = primaryTicket ? formatTicketCodeForDisplay(primaryTicket.ticket_code) : 'N/A';
    const ticketIdLines = doc.splitTextToSize(ticketId, infoValueWidth);
    doc.text(ticketIdLines, leftMargin + infoLabelWidth, currentY);
    currentY += ticketIdLines.length * 4 + 3;

    // Order Date
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Order Date:', leftMargin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const orderDateFormatted = formatDate(order.created_at);
    const orderDateLines = doc.splitTextToSize(orderDateFormatted, infoValueWidth);
    doc.text(orderDateLines, leftMargin + infoLabelWidth, currentY);

    // ==================== SAVE PDF ====================
    const fileName = `Ticket_${event.slug || event.id}_${order.id.substring(0, 8)}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
      {/* Header with logo */}
      <div className="bg-gray-300 px-6 py-4">
        <div className="flex items-center">
          <Image
            src="/accezzlive cl.png"
            alt="Accezz Logo"
            width={140}
            height={90}
            className="h-10 w-auto"
          />
        </div>
      </div>

      <div className="lg:p-8 p-6">
        {/* Ticket Title */}
        <h1 className="text-2xl lg:text-4xl font-bold">Ticket</h1>
        {/* Dashed Separator */}
        <div className="flex items-center mb-5">
          <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
          <div className="mx-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
        </div>

        {/* Event Details and QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left: Event Details */}
          <div>
            {event.image_url && (
              <div className="mb-4">
                <Image
                  src={event.image_url}
                  alt={event.title}
                  width={400}
                  height={300}
                  className="w-full lg:w-64 h-48 object-cover rounded-xl"
                />
              </div>
            )}
            <h2 className="text-xl lg:text-2xl font-bold mb-2">{event.title}</h2>
            <p className="text-gray-600 mb-1">{formatDate(order.created_at)}</p>
            <p className="text-gray-600 mb-4">
              {event.venue || event.address || event.location || event.city || 'Location TBD'}
            </p>
            <p className="text-gray-700 mb-2">{buyerName}</p>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              <p className="text-xs lg:text-sm text-gray-600">
                {attendeeCount} {attendeeCount === 1 ? 'Ticket' : 'Tickets'} Purchased
              </p>
            </div>
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col items-center justify-center">
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4">Powered by Accezz</p>
          </div>
        </div>

        {/* Dashed Separator */}
        <div className="flex items-center my-8">
          <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
          <div className="mx-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
        </div>

      

        {/* Invoice Summary */}
        <div className="flex justify-end mb-6">
          <div className="text-right">
            <p className="text-base lg:text-lg font-bold text-gray-900 mb-2">
              Total : {formatCurrency(order.total_amount, order.currency)}
            </p>
            {/* <p className="text-sm text-gray-600">
              Paid via {order.payment_provider?.toUpperCase() || 'PAYSTACK'}
            </p> */}
          </div>
        </div>

        {/* Ticket Info Section */}
        <div className="flex justify-between items-end mb-4">
          <div className="">
            <p className="text-xs lg:text-sm text-gray-600">Ticket Type : <span className="font-semibold">{ticketTypeName}</span></p>
            <p className="text-xs lg:text-sm text-gray-600">Ticket ID : <span className="font-semibold">{primaryTicket ? formatTicketCodeForDisplay(primaryTicket.ticket_code) : 'N/A'}</span></p>
            <p className="text-xs lg:text-sm text-gray-600">Order Date : <span className="font-semibold">{formatDate(order.created_at)}</span></p>
          </div>
        </div>

        {/* Download PDF Button */}
        <button
          onClick={generatePDF}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 transition-colors mb-4"
          style={{ borderRadius: '5px' }}
        >
          Download PDF Ticket
        </button>

        {/* Call to Action Button */}
        <button
          style={{ borderRadius: '5px' }}
          onClick={() => {
            if (event.slug) {
              router.push(`/${event.slug}`);
            } else {
              router.push('/events');
            }
          }}
          className="w-full bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white font-semibold py-4 px-6 transition-colors"
        >
          Explore more events
        </button>
      </div>
    </div>
  );
};

export default Invoice;