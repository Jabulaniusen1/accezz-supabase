'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/formatPrice';
import Toast from '../../components/ui/Toast';
import { supabase } from '@/utils/supabaseClient';

interface Event {
  id: string;
  title: string;
  description: string;
  time: string;
  image: string;
  date: string;
  location: string;
  ticketType: TicketType[];
}

interface TicketType {
  name: string;
  sold: string;
  price: string;
  quantity: string;
}

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
  isScanned: boolean;
}

interface InfoFieldProps {
  label: string;
  value: string | number;
  className?: string;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value, className = '' }) => (
  <div className="flex flex-col gap-1 sm:gap-2">
    <span className="text-xs sm:text-sm text-gray-500 font-medium">{label}</span>
    <span className={`${className}`}>{value}</span>
  </div>
);

const ValidateContent = () => {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('ticketId');
  const signature = searchParams.get('signature');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string; } | null>(null);
  // const eventId = ticketData?.eventId;
  const [event, setEvent] = useState<Event | undefined>();

  const handleValidate = async () => {
    if (!ticketData || !signature || !ticketId || isScanned) return;

    try {
      // Verify signature matches ticket code
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('ticket_code, is_scanned, validation_status')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      // Verify signature matches ticket code
      if (ticket.ticket_code !== signature) {
        throw new Error('Invalid ticket signature');
      }

      // Check if already scanned
      if (ticket.is_scanned) {
        setTicketData({ ...ticketData, isScanned: true });
        setToast({ type: 'info', message: 'Ticket already validated' });
        return;
      }

      // Get current session for scanner user ID
      const { data: { session } } = await supabase.auth.getSession();
      
      // Mark ticket as scanned
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          is_scanned: true,
          scanned_at: new Date().toISOString(),
          validation_status: 'valid',
        })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      // Create ticket scan record (if user is authenticated)
      if (session?.user?.id) {
        const { error: scanError } = await supabase
          .from('ticket_scans')
          .insert({
            ticket_id: ticketId,
            scanned_by_user_id: session.user.id,
            result: 'success',
          });
        
        if (scanError) {
          console.error('Error creating scan record:', scanError);
        }
      }

      setTicketData({ ...ticketData, isScanned: true });
      setToast({ type: 'success', message: 'Ticket validated successfully!' });
    } catch (err: unknown) {
      console.error('Error validating ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to validate ticket';
      setToast({ type: 'error', message });
    }
  };


  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId) {
        setError('No ticket ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch ticket with order and event details
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            *,
            orders!inner(
              buyer_email,
              buyer_full_name,
              buyer_phone,
              currency,
              total_amount,
              meta
            ),
            events!inner(
              id,
              title,
              image_url,
              date,
              time,
              venue,
              location
            ),
            ticket_types!inner(
              name
            )
          `)
          .eq('id', ticketId)
          .single();

        if (ticketError || !ticket) {
          throw ticketError || new Error('Ticket not found');
        }

        // Map ticket data
        const mappedTicketData: TicketData = {
          id: ticket.id,
          email: ticket.orders.buyer_email || '',
          phone: ticket.orders.buyer_phone || '',
          fullName: ticket.orders.buyer_full_name || '',
          eventId: ticket.event_id,
          ticketType: ticket.ticket_types.name,
          price: Number(ticket.price),
          purchaseDate: ticket.created_at,
          qrCode: ticket.qr_code_url || '',
          currency: ticket.currency || 'NGN',
          attendees: ticket.orders.meta?.attendees || [],
          isScanned: ticket.is_scanned || false,
        };

        setTicketData(mappedTicketData);
        setLoading(false);

        // Fetch event data
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, image_url, start_time, end_time, venue, location, address, city')
          .eq('id', ticket.event_id)
          .single();

        if (!eventError && eventData) {
          const mappedEvent: Event = {
            id: eventData.id,
            title: eventData.title,
            description: '',
            time: (() => {
              const start = eventData.start_time ? new Date(eventData.start_time) : null;
              if (!start || Number.isNaN(start.getTime())) return '';
              return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
            })(),
            image: eventData.image_url || '',
            date: eventData.start_time,
            location: eventData.location || eventData.address || eventData.city || '',
            ticketType: [],
          };
          setEvent(mappedEvent);
        }
      } catch (err: unknown) {
        setError('Failed to fetch ticket details');
        setLoading(false);
        console.error('Error fetching ticket:', err);
      }
    };

    fetchTicketData();
  }, [ticketId]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <CircularProgress />
      <p className="mt-4 text-gray-600">Loading ticket information...</p>
    </div>
  );
  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <div className="text-center">
        <p className="text-red-500 text-lg sm:text-xl font-semibold mb-2">{error}</p>
        <p className="text-gray-600">Please check your ticket link and try again.</p>
      </div>
    </div>
  );
  if (!ticketData) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <p className="text-gray-900 text-lg sm:text-xl font-semibold">No ticket data found</p>
    </div>
  );

  
  const isScanned = ticketData.isScanned;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
  {toast && <Toast {...toast} onClose={() => setToast(null)} />}

  {/* Header Section */}
  <header className="flex justify-center items-center py-4 sm:py-6 border-b border-gray-200">
    <div className="flex items-center gap-3 sm:gap-4">
      <Image
        src="/accezz logo c.png"
        alt="Accezz Logo"
        width={120}
        height={40}
        className="h-8 sm:h-10 md:h-12 w-auto object-contain"
        priority
      />
    </div>
  </header>

  {/* Main Content */}
  <main className="flex flex-col items-center space-y-5 sm:space-y-10">
    {/* Title Section */}
    <section className="text-center space-y-4 sm:space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900"
      >
        Ticket Validation Portal
      </motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold rounded-lg shadow-md ${
          isScanned 
            ? 'bg-green-500 text-white' 
            : 'bg-[#f54502] text-white'
        }`}
      >
        {isScanned === true ? (
          <>
            <span className="text-lg sm:text-xl">✓</span>
            <span>Validated</span>
          </>
        ) : (
          <>
            <span className="text-lg sm:text-xl">⏳</span>
            <span>Pending Validation</span>
          </>
        )}
      </motion.div>
    </section>

    {event && (
      <div
        className="relative w-full max-w-6xl h-48 sm:h-64 md:h-80 bg-cover bg-center rounded-xl overflow-hidden shadow-lg border-2 border-gray-200"
        style={{ backgroundImage: `url(${event.image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40 flex flex-col justify-center items-center text-center p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight">{event.title}</h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mt-2">{new Date(event.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}, {event.time}</p>
        </div>
      </div>
    )}


    {/* Ticket and Attendee Details */}
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Ticket Information */}
      <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md border border-gray-200">
        <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-[#f54502] pb-3 mb-6 text-gray-900">Ticket Information</h3>
        <div className="space-y-4 sm:space-y-5">
          {event && <InfoField label="Event" value={event.title} className="text-base sm:text-lg font-medium text-gray-900" />}
          <InfoField label="Ticket Type" value={ticketData.ticketType} className="text-base sm:text-lg font-medium text-gray-900" />
          <InfoField
            label="Purchase Date"
            value={new Date(ticketData.purchaseDate).toLocaleString()}
            className="text-base sm:text-lg font-medium text-gray-900"
          />
          <InfoField
            label="Price"
            value={formatPrice(ticketData.price, ticketData.currency)}
            className="text-lg sm:text-xl font-bold text-[#f54502]"
          />
        </div>
      </div>

      {/* Attendee Information */}
      <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md border border-gray-200">
        <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-[#f54502] pb-3 mb-6 text-gray-900">Attendee Details</h3>
        <div className="space-y-4 sm:space-y-5">
          <InfoField label="Name" value={ticketData.fullName} className="text-base sm:text-lg font-medium text-gray-900" />
          <InfoField label="Email" value={ticketData.email} className="text-base sm:text-lg font-medium text-gray-900" />
          <InfoField label="Phone" value={ticketData.phone} className="text-base sm:text-lg font-medium text-gray-900" />
        </div>
      </div>
    </section>


    {/* Additional Attendees */}
      {ticketData.attendees?.length > 0 && (
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md border border-gray-200">
            <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-[#f54502] pb-3 mb-6 text-gray-900">Additional Attendees</h3>
            <div className="space-y-3 sm:space-y-4">
              {ticketData.attendees.map((attendee, index) => (
                <div
                  key={index}
                  className="flex flex-wrap text-base sm:text-lg border-b border-gray-200 pb-3 sm:pb-4"
                >
                  <p className="font-medium text-gray-900">
                    {attendee.name} - <span className="text-gray-600">{attendee.email}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


  <motion.button
      onClick={handleValidate}
      disabled={isScanned}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className={`w-full max-w-md mx-auto py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg transform transition-all duration-300 ${
        isScanned
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-[#f54502] hover:bg-[#d63a02] text-white hover:scale-105 hover:shadow-xl active:scale-95'
      }`}
    >
    {isScanned ? 'Ticket Already Validated' : 'Validate Ticket Now'}
  </motion.button>


  </main>

 
</div>


  );
};

const ValidatePage = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><CircularProgress /></div>}>
      <ValidateContent />
    </Suspense>
  );
};

export default ValidatePage;
