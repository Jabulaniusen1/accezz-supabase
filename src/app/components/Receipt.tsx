'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import TicketLoader from '@/components/ui/loader/ticketLoader';
import ErrorHandler from '@/components/ErrorHandler';

type ReceiptProps = {
  closeReceipt?: () => void;
  isModal?: boolean;
};

interface Attendee {
  name: string;
  email: string;
}

interface EventData {
  id: string;
  title: string;
  image: string;
  date: string;
  time: string;
  venue: string;
  location: string;
}

interface TicketData {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  eventId: string;
  ticketType: string;
  price: number;
  purchaseDate: string;
  qrCode: string;
  currency: string;
  attendees: Attendee[];
}

const Receipt = ({ closeReceipt, isModal = true }: ReceiptProps) => {
  const router = useRouter();
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch ticket data from API
  const fetchTicketData = async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const ticketId = searchParams.get('ticketId');
      if (!ticketId) throw new Error('No ticket information found in URL');
      const { data } = await axios.get(`${BASE_URL}api/v1/tickets/${ticketId}`);
      setTicketData(data.ticket);
      
      // Fetch event data if eventId is available
      if (data.ticket?.eventId) {
        try {
          const eventResponse = await axios.get(`${BASE_URL}api/v1/events/${data.ticket.eventId}`);
          setEventData(eventResponse.data.event);
        } catch (eventErr) {
          console.error('Error fetching event data:', eventErr);
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch ticket details');
      console.log(err);
      setTicketData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retry handler for ErrorHandler
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchTicketData();
  };

  // SHOW LOADER WHILE FETCHING DATA
  if (loading) {
    return (
      <div className={isModal ? "fixed inset-0 flex items-center justify-center bg-black/60 z-50" : "flex items-center justify-center py-20"}>
        <TicketLoader />
      </div>
    );
  }
  
  // SHOW ERROR HANDLER IF ERROR OCCURS
  if (error) {
    return (
        <ErrorHandler
          error={error}
          onClose={closeReceipt || (() => {})}
          retry={handleRetry}
    />
    );
  }
  
  if (!ticketData) {
    return (
      <ErrorHandler
      error="No ticket data available"
      onClose={closeReceipt || (() => {})}
      retry={handleRetry}
    />
    );
  }

  const generatePDF = async () => {
    if (!ticketData) return null;
  
    const qrCodeBase64 = await fetchQRCodeAsBase64(ticketData.qrCode);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // White background matching the site
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');
  
    // Top border accent (matching border-t-4 border-[#f54502])
    doc.setFillColor(245, 69, 2);
    doc.rect(0, 0, 210, 4, 'F');
    
    const pageWidth = 210;
    const leftMargin = 20;
    const rightMargin = 20;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let currentY = 25;
    
    // Event Title (matching site: font-bold text-xl/text-3xl)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20); // Mobile-optimized size
    doc.setTextColor(29, 29, 29); // text-gray-900
    const title = eventData?.title || 'Event';
    const titleLines = doc.splitTextToSize(title, contentWidth);
    doc.text(titleLines, leftMargin, currentY);
    currentY += titleLines.length * 8 + 20;
    
    // Event Details Section (matching site layout)
    const sectionSpacing = 12;
    let yPos = currentY;
    
    // Date section with icon background (bg-[#f54502]/10)
    if (eventData?.date) {
      const iconSize = 6;
      const iconBgY = yPos - 2;
      
      // Icon background (light orange)
      doc.setFillColor(255, 235, 230); // Approximate bg-[#f54502]/10
      doc.roundedRect(leftMargin, iconBgY, iconSize, iconSize, 1, 1, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(128, 128, 128); // text-gray-500
      doc.text('Date', leftMargin + iconSize + 4, yPos);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(29, 29, 29); // text-gray-900
      const dateText = new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const dateLines = doc.splitTextToSize(dateText, contentWidth - iconSize - 4);
      doc.text(dateLines, leftMargin + iconSize + 4, yPos + 6);
      yPos += Math.max(dateLines.length * 6, 12) + sectionSpacing;
    }
    
    // Time section
    if (eventData?.time) {
      const iconSize = 6;
      const iconBgY = yPos - 2;
      
      doc.setFillColor(255, 235, 230);
      doc.roundedRect(leftMargin, iconBgY, iconSize, iconSize, 1, 1, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(128, 128, 128);
      doc.text('Time', leftMargin + iconSize + 4, yPos);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(29, 29, 29);
      const timeLines = doc.splitTextToSize(eventData.time, contentWidth - iconSize - 4);
      doc.text(timeLines, leftMargin + iconSize + 4, yPos + 6);
      yPos += Math.max(timeLines.length * 6, 12) + sectionSpacing;
    }
    
    // Venue section
    if (eventData?.venue) {
      const iconSize = 6;
      const iconBgY = yPos - 2;
      
      doc.setFillColor(255, 235, 230);
      doc.roundedRect(leftMargin, iconBgY, iconSize, iconSize, 1, 1, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(128, 128, 128);
      doc.text('Venue', leftMargin + iconSize + 4, yPos);
      
      doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
      doc.setTextColor(29, 29, 29);
      const venueLines = doc.splitTextToSize(eventData.venue, contentWidth - iconSize - 4);
      doc.text(venueLines, leftMargin + iconSize + 4, yPos + 6);
      yPos += Math.max(venueLines.length * 6, 12) + sectionSpacing;
    }
    
    // Ticket Type section (matching site: bg-[#f54502]/10 p-3 rounded-md border border-[#f54502]/20)
    const ticketBoxY = yPos;
    const ticketBoxHeight = 20;
    const ticketBoxPadding = 5;
    
    // Background (light orange)
    doc.setFillColor(255, 235, 230);
    doc.roundedRect(leftMargin, ticketBoxY, contentWidth, ticketBoxHeight, 2, 2, 'F');
    
    // Border (lighter orange)
    doc.setDrawColor(245, 200, 190); // Approximate border-[#f54502]/20
    doc.setLineWidth(0.5);
    doc.roundedRect(leftMargin, ticketBoxY, contentWidth, ticketBoxHeight, 2, 2, 'S');
    
    // Icon background (darker orange for icon)
    doc.setFillColor(255, 220, 210);
    doc.roundedRect(leftMargin + ticketBoxPadding, ticketBoxY + ticketBoxPadding, 5, 5, 1, 1, 'F');
    
    // Ticket Type label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Ticket Type', leftMargin + ticketBoxPadding + 7, ticketBoxY + 6);
    
    // Ticket Type value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(245, 69, 2); // Primary color
    const ticketTypeLines = doc.splitTextToSize(ticketData.ticketType, contentWidth - 70);
    doc.text(ticketTypeLines, leftMargin + ticketBoxPadding + 7, ticketBoxY + 13);
    
    // Price on the right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Price', leftMargin + contentWidth - 50, ticketBoxY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(245, 69, 2);
    doc.text(`${ticketData.currency} ${ticketData.price}`, leftMargin + contentWidth - 50, ticketBoxY + 14);
    
    yPos += ticketBoxHeight + 25;
    
    // QR Code Section (centered, matching site design)
    const qrSize = 70; // Mobile-optimized size
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = yPos;
    
    // White background box with border (matching site)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 2, 2, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 2, 2, 'S');
    
    // QR Code
    doc.addImage(qrCodeBase64, 'PNG', qrX, qrY, qrSize, qrSize);
  
    // QR Code label
    yPos += qrSize + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    const qrLabel = 'Present this QR code at the event entrance for verification';
    const qrLabelLines = doc.splitTextToSize(qrLabel, contentWidth);
    doc.text(qrLabelLines, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += qrLabelLines.length * 5 + 15;
    
    // Powered by Accezz section
    const poweredByY = Math.min(280, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Powered by', pageWidth / 2, poweredByY, { align: 'center' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(245, 69, 2);
    doc.text('Accezz', pageWidth / 2, poweredByY + 6, { align: 'center' });
    
    return doc;
  };

  const sharePDF = async () => {
    if (!ticketData) return;
    
    const doc = await generatePDF();
    if (!doc) return;
    
    // Convert PDF to blob
    const pdfBlob = doc.output('blob');
    
    // Create a shareable file
    const fileName = eventData?.title 
      ? `${eventData.title.replace(/[^a-z0-9]/gi, '_')}_Ticket.pdf`
      : `${ticketData.fullName}_Ticket.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    // Check if Web Share API is available
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'My Event Ticket',
          text: `Check out my ticket for ${eventData?.title || ticketData.ticketType}`,
          files: [file],
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to download if share fails
        doc.save(fileName);
      }
    } else {
      // Fallback: copy link or open share dialog
      const shareUrl = `https://twitter.com/intent/tweet?text=Check out my ticket for ${encodeURIComponent(eventData?.title || ticketData.ticketType)}!&url=${encodeURIComponent(window.location.href)}`;
      
      // Try opening share options
      if (window.innerWidth < 768) {
        // Mobile: show native share sheet if available
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'My Event Ticket',
              text: `Check out my ticket for ${eventData?.title || ticketData.ticketType}`,
              url: window.location.href,
            });
          } catch {
            window.open(shareUrl, '_blank');
          }
        } else {
          window.open(shareUrl, '_blank');
        }
      } else {
        // Desktop: open Twitter share
        window.open(shareUrl, '_blank');
      }
    }
  };

  const downloadPDF = async () => {
    if (!ticketData) return;
  
    const doc = await generatePDF();
    if (!doc) return;
  
    // Save the PDF
    const fileName = eventData?.title 
      ? `${eventData.title.replace(/[^a-z0-9]/gi, '_')}_Ticket.pdf`
      : `${ticketData.fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_Ticket.pdf`;
    doc.save(fileName);
  };

  const fetchQRCodeAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching QR code:', error);
      throw new Error('Failed to fetch QR code');
    }
  };

  const containerClasses = isModal 
    ? "fixed inset-0 bg-white/60 backdrop-blur-lg flex items-center justify-center z-50 p-2 sm:p-4"
    : "w-full flex items-center justify-center p-2 sm:p-4";

  return (
    <div
      className={containerClasses}
    >
      <div className="relative w-full max-w-[350px] sm:max-w-[600px] md:max-w-[700px] max-h-auto sm:max-h-[90vh] overflow-visible sm:overflow-auto bg-white rounded-2xl sm:rounded-[20px] shadow-2xl border-2 border-[#f54502]/20">
        {/* Close Button - Only show if modal mode and closeReceipt is provided */}
        {isModal && closeReceipt && (
        <button
          onClick={closeReceipt}
            className="absolute top-1 right-1 sm:top-2 sm:right-2 text-gray-400 hover:text-[#f54502] z-10 w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        )}

        {/* Back Button - Only show when not in modal mode */}
        {!isModal && (
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 hover:bg-white text-gray-600 hover:text-[#f54502] transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Go Back</span>
          </button>
        )}

        {/* Ticket Content */}
        <div className="bg-white rounded-xl sm:rounded-[18px] p-4 sm:p-8 md:p-10 relative overflow-hidden border-t-4 border-[#f54502]">
          {/* Mobile Version - Compact Layout */}
          <div className="block sm:hidden">
            {/* Event Image */}
            {eventData?.image && (
              <div className="mb-6 rounded-xl overflow-hidden">
                <Image
                  src={eventData.image}
                  alt={eventData.title || 'Event'}
                  width={400}
                  height={200}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {/* Event Details */}
            <div className="mb-6">
              <h2 className="font-bold text-xl text-gray-900 mb-4">
                {eventData?.title || 'Event'}
              </h2>
              
              <div className="space-y-3">
                {eventData?.date && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-700 text-sm font-medium">
                      {new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
                )}
                
                {eventData?.time && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-700 text-sm font-medium">{eventData.time}</p>
              </div>
                )}
                
                {eventData?.venue && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-700 text-sm font-medium">{eventData.venue}</p>
            </div>
                )}
                
                <div className="flex items-center gap-2 bg-[#f54502]/10 p-3 rounded-md border border-[#f54502]/20 mt-4">
                  <svg className="w-4 h-4 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs">Ticket Type</p>
                    <p className="font-bold text-[#f54502] text-sm">{ticketData.ticketType}</p>
                  </div>
                  <p className="font-bold text-[#f54502] text-sm">
                    {ticketData.currency} {ticketData.price}
                  </p>
                </div>
              </div>
            </div>

            {/* Compact QR Code */}
            <div className="text-center mb-6">
              <div className="bg-white p-2 rounded-lg inline-block border border-gray-200">
                <Image
                  src={ticketData.qrCode}
                  alt="Ticket QR Code"
                  width={120}
                  height={120}
                  className="rounded-lg"
                  priority
                />
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex gap-3">
            <button
              onClick={downloadPDF}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-md text-xs transition-all duration-200"
              >
                Download PDF
              </button>
              <button
                onClick={sharePDF}
                className="flex-1 bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white font-bold py-3 px-4 rounded-md text-xs transition-all duration-200 flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
            </button>
            </div>
          </div>

          {/* Desktop Version - Detailed Layout */}
          <div className="hidden sm:block">
            {/* Event Image */}
            {eventData?.image && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <Image
                  src={eventData.image}
                  alt={eventData.title || 'Event'}
                  width={800}
                  height={300}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Event Details */}
            <div className="mb-8">
              <h1 className="font-bold text-3xl text-gray-900 mb-6">
                {eventData?.title || 'Event'}
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {eventData?.date && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f54502]/10 rounded-lg">
                      <svg className="w-5 h-5 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  <div>
                      <p className="text-gray-500 text-sm">Date</p>
                      <p className="text-gray-900 font-semibold">
                        {new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                
                {eventData?.time && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f54502]/10 rounded-lg">
                      <svg className="w-5 h-5 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <div>
                      <p className="text-gray-500 text-sm">Time</p>
                      <p className="text-gray-900 font-semibold">{eventData.time}</p>
                    </div>
                  </div>
                )}
                
                {eventData?.venue && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#f54502]/10 rounded-lg">
                      <svg className="w-5 h-5 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  <div>
                      <p className="text-gray-500 text-sm">Venue</p>
                      <p className="text-gray-900 font-semibold">{eventData.venue}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 bg-[#f54502]/10 p-4 rounded-lg border border-[#f54502]/20">
                  <div className="p-2 bg-[#f54502]/20 rounded-lg">
                    <svg className="w-5 h-5 text-[#f54502]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-sm">Ticket Type</p>
                    <p className="text-gray-900 font-bold text-lg">{ticketData.ticketType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-sm">Price</p>
                    <p className="text-[#f54502] font-bold text-xl">
                      {ticketData.currency} {ticketData.price}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop QR Code Section */}
            <div className="text-center bg-gray-50 p-10 rounded-2xl border-2 border-[#f54502]/20 mb-8">
              <div className="bg-white p-6 rounded-2xl inline-block shadow-lg">
            <Image
              src={ticketData.qrCode}
              alt="Ticket QR Code"
              width={150}
              height={150}
                  className="rounded-lg"
              priority
                />
              </div>
              
              <p className="text-gray-500 mt-4 text-base px-4">
                Present this QR code at the event entrance for verification
              </p>
            </div>

            {/* Desktop Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={downloadPDF}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200"
              >
                Download PDF
              </button>
              <button
                onClick={sharePDF}
                className="bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Ticket
              </button>
            </div>
          </div>
        </div>
         </div>
    </div>
  );
};export default Receipt;

