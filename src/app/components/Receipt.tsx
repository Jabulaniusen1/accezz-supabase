'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import axios from 'axios';
import { BASE_URL } from '../../../config';
import TicketLoader from '@/components/ui/loader/ticketLoader';
import ErrorHandler from '@/components/ErrorHandler';

type ReceiptProps = {
  closeReceipt: () => void;
};

interface Attendee {
  name: string;
  email: string;
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

const Receipt = ({ closeReceipt }: ReceiptProps) => {
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
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
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <TicketLoader />
      </div>
    );
  }
  
  // SHOW ERROR HANDLER IF ERROR OCCURS
  if (error) {
    return (
        <ErrorHandler
          error={error}
          onClose={closeReceipt}
          retry={handleRetry}
    />
    );
  }
  
  if (!ticketData) {
    return (
      <ErrorHandler
      error="No ticket data available"
      onClose={closeReceipt}
      retry={handleRetry}
    />
    );
  }

  const downloadPDF = async () => {
    if (!ticketData) return;
  
    // Fetch the QR code image and convert it to base64
    const qrCodeBase64 = await fetchQRCodeAsBase64(ticketData.qrCode);
  
    const doc = new jsPDF();
  
    // Set a professional background color
    doc.setFillColor(245, 245, 245); // Light gray background
    doc.rect(0, 0, 210, 297, 'F');
  
    // Header Section
    doc.setFillColor(25, 103, 210); // Dark blue header
    doc.rect(0, 0, 210, 50, 'F');
  
    // Add Accezz logo and text
    const logoWidth = 20;
    const logoHeight = 20;
    const logoX = 15;
    const logoY = 15;
  
    doc.addImage('/favicon.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('Accezz', logoX + logoWidth + 5, logoY + logoHeight / 2 + 4);
  
    // Header Title
    doc.setFontSize(24);
    doc.text('Event Ticket', 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Official Receipt', 105, 40, { align: 'center' });
  
    // Decorative Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
  
    // Main Content Section
    const startY = 70;
    const leftMargin = 20;
    const lineHeight = 10;
  
    // Ticket holder details in a box
    doc.setFillColor(255, 255, 255); // White background for the box
    doc.roundedRect(leftMargin, startY - 5, 170, 75, 5, 5, 'F'); // Rounded corners
  
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(25, 103, 210); // Dark blue text
    doc.text('Ticket Details', leftMargin + 10, startY);
  
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Black text
    doc.text(`Name: ${ticketData.fullName}`, leftMargin + 10, startY + lineHeight);
    doc.text(`Ticket Type: ${ticketData.ticketType}`, leftMargin + 10, startY + lineHeight * 2);
    doc.text(`Date: ${new Date(ticketData.purchaseDate).toLocaleString()}`, leftMargin + 10, startY + lineHeight * 3);
    doc.text(`Email: ${ticketData.email}`, leftMargin + 10, startY + lineHeight * 4);
    doc.text(`Phone: ${ticketData.phone}`, leftMargin + 10, startY + lineHeight * 5);
  
    // Price section
    doc.setFillColor(230, 240, 255); // Light blue background
    doc.roundedRect(leftMargin, startY + 80, 170, 20, 5, 5, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 103, 210); // Dark blue text
    doc.text(`Total Price: ${ticketData.currency} ${ticketData.price}`, leftMargin + 10, startY + 90);
  
    // Additional attendees
    if (ticketData.attendees?.length > 0) {
      const attendeesStartY = startY + 110;
      doc.setFillColor(255, 255, 255); // White background for the box
      doc.roundedRect(leftMargin, attendeesStartY - 5, 170, 10 + (ticketData.attendees.length * lineHeight), 5, 5, 'F');
  
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 103, 210); // Dark blue text
      doc.text('Additional Attendees:', leftMargin + 10, attendeesStartY);
  
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0); // Black text
      ticketData.attendees.forEach((attendee, index) => {
        doc.text(
          `${index + 1}. ${attendee.name} (${attendee.email})`,
          leftMargin + 10,
          attendeesStartY + 10 + (index * lineHeight)
        );
      });
    }
  
    // QR Code Section
    const qrSize = 60;
    const qrX = 130;
    const qrY = 180;
  
    doc.setFillColor(255, 255, 255); // White background for the QR code box
    doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 5, 5, 'F');
    doc.addImage(qrCodeBase64, 'PNG', qrX, qrY, qrSize, qrSize);
  
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128); // Gray text
    doc.text('Scan QR Code at event entry', qrX + qrSize / 2, qrY + qrSize + 10, { align: 'center' });
  
    // Footer Section
    const footerY = 270;
    doc.setDrawColor(25, 103, 210); // Dark blue line
    doc.setLineWidth(0.5);
    doc.line(20, footerY, 190, footerY);
  
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128); // Gray text
    doc.text('This is an official ticket. Please present this document at the event.', 105, footerY + 10, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, footerY + 15, { align: 'center' });
  
    // Save the PDF
    const sanitizedName = ticketData.fullName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${sanitizedName}_Virtual_Ticket.pdf`);
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-white/60 backdrop-blur-lg flex items-center justify-center z-50 p-2 sm:p-4"
    >
      <div className="relative w-full max-w-[350px] sm:max-w-[600px] md:max-w-[700px] max-h-auto sm:max-h-[90vh] overflow-visible sm:overflow-auto bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl sm:rounded-[20px] p-0.5 sm:p-[3px] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={closeReceipt}
          className="absolute top-1 right-1 sm:top-2 sm:right-2 text-white bg-white/20 hover:bg-white/30 z-10 w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Ticket Content */}
        <div className="bg-white rounded-xl sm:rounded-[18px] p-4 sm:p-8 md:p-10 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] sm:before:h-1 before:bg-gradient-to-r before:from-[#667eea] before:via-[#764ba2] before:to-[#667eea]">
          {/* Mobile Version - Compact Layout */}
          <div className="block sm:hidden">
            {/* Compact Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Image
                  src="/favicon.png"
                  alt="Accezz Logo"
                  width={24}
                  height={24}
                  className="rounded-lg"
                />
                <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#667eea] to-[#764ba2] text-lg">
                  Accezz
                </h2>
              </div>
              {/* <h3 className="font-bold text-gray-800 text-sm">
                Event Ticket
              </h3> */}
            </div>

            {/* Compact User Details */}
            <div className="mb-6">
              <div className="mb-4">
                <label className="text-gray-500 text-xs block mb-1">
                  Name
                </label>
                <p className="font-semibold text-gray-800 text-sm break-words">
                  {ticketData.fullName}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="text-gray-500 text-xs block mb-1">
                  Email
                </label>
                <p className="font-semibold text-gray-800 text-sm break-all">
                  {ticketData.email}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="text-gray-500 text-xs block mb-1">
                  Phone
                </label>
                <p className="font-semibold text-gray-800 text-sm">
                  {ticketData.phone}
                </p>
              </div>
            </div>

            {/* Compact Ticket Info */}
            <div className="flex justify-between items-center mb-6 bg-gray-50 p-2 rounded-md">
              <div>
                <p className="text-gray-500 text-xs">
                  {ticketData.ticketType}
                </p>
                <p className="font-semibold text-gray-800 text-xs">
                  {new Date(ticketData.purchaseDate).toLocaleDateString()}
                </p>
              </div>
              <p className="font-bold text-[#667eea] text-sm">
                {ticketData.currency} {ticketData.price}
              </p>
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

            {/* Compact Success Message */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-md text-center mb-6">
              <p className="font-bold text-xs mb-1">
                🎉 Ticket Purchased Successfully!
              </p>
              <p className="text-xs leading-tight">
                Take a screenshot so you don&apos;t miss the event
              </p>
            </div>

            {/* Compact Download Button */}
            <button
              onClick={downloadPDF}
              className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#667eea] text-white font-bold py-3 px-4 rounded-md text-xs transition-all duration-200"
            >
              Download Full PDF
            </button>
          </div>

          {/* Desktop Version - Detailed Layout */}
          <div className="hidden sm:block">
            {/* Desktop Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Image
                  src="/favicon.png"
                  alt="Accezz Logo"
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
                <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#667eea] to-[#764ba2] text-4xl">
                  Accezz
                </h1>
              </div>
              {/* <h2 className="font-bold text-gray-800 mb-1 text-2xl">
                Event Ticket
              </h2>
              <p className="text-gray-500 text-base break-all">
                Ticket ID: {ticketData.id}
              </p> */}
            </div>

            {/* Desktop Ticket Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Left Column - User Details */}
              <div>
                <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200 text-xl">
                  Ticket Holder
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Full Name
                    </label>
                    <p className="font-semibold text-gray-800 text-lg break-words">
                      {ticketData.fullName}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Email Address
                    </label>
                    <p className="font-semibold text-gray-800 text-lg break-all">
                      {ticketData.email}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Phone Number
                    </label>
                    <p className="font-semibold text-gray-800 text-lg">
                      {ticketData.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Ticket Info */}
              <div>
                <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200 text-xl">
                  Ticket Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Ticket Type
                    </label>
                    <p className="font-semibold text-gray-800 text-lg">
                      {ticketData.ticketType}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Purchase Date
                    </label>
                    <p className="font-semibold text-gray-800 text-lg">
                      {new Date(ticketData.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Total Price
                    </label>
                    <p className="font-bold text-[#667eea] text-2xl">
                      {ticketData.currency} {ticketData.price}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Attendees - Desktop */}
          {ticketData.attendees?.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200 text-xl">
                  Additional Attendees
                </h3>
                <div className="flex flex-wrap gap-4">
              {ticketData.attendees.map((attendee, index) => (
                    <div
                      key={index}
                      className="bg-gray-100 p-4 rounded-xl min-w-[250px] flex-1"
                    >
                      <p className="font-semibold text-gray-800 text-base">
                        {attendee.name}
                      </p>
                      <p className="text-gray-500 text-sm break-all">
                        {attendee.email}
                      </p>
                    </div>
                  ))}
                </div>
            </div>
          )}

            {/* Desktop QR Code Section */}
            <div className="text-center bg-gray-50 p-10 rounded-2xl border-2 border-dashed border-gray-200 mb-8">
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

            {/* Desktop Success Message */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl text-center mb-8">
              <h3 className="font-bold text-2xl mb-2">
                🎉 Ticket Purchased Successfully!
              </h3>
                             <p className="text-lg leading-relaxed">
                 Now, hurry and take a Screenshot, so you don&apos;t miss out on the event
               </p>
            </div>

            {/* Desktop Download Button */}
            <div className="text-center">
              <button
                onClick={downloadPDF}
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#764ba2] hover:to-[#667eea] text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200"
              >
                Download Full Ticket PDF
              </button>
            </div>
          </div>
        </div>
         </div>
    </motion.div>
  );
};

export default Receipt;