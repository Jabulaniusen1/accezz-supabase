'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/formatPrice';
import Toast from '../../components/ui/Toast';
import { supabase } from '@/utils/supabaseClient';
import Logo from '@/components/ui/Logo';

type ScanStatus = 'valid' | 'invalid' | 'refunded' | 'revoked';

interface TicketData {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  buyerName: string;
  buyerPhone: string;
  ticketType: string;
  price: number;
  currency: string;
  purchaseDate: string;
  validationStatus: ScanStatus;
  isScanned: boolean;
  scannedAt: string | null;
  event: {
    id: string;
    title: string;
    image: string;
    startTime: string;
    endTime: string | null;
    location: string;
  } | null;
}

type ScanResponse = {
  ticket?: TicketData;
  result?: 'success' | 'duplicate' | 'revoked' | 'invalid';
  error?: string;
  reason?: string;
};

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
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string; } | null>(null);

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const handleValidate = async () => {
    if (!ticketData || !signature || !ticketId || ticketData.isScanned || validating) return;

    setValidating(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsLogin(true);
        return;
      }

      const res = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticketId, signature }),
      });
      const data = await res.json().catch(() => ({})) as ScanResponse;

      if (data.ticket) setTicketData(data.ticket);

      if (data.result === 'success') {
        setToast({ type: 'success', message: 'Ticket validated successfully!' });
      } else if (data.result === 'duplicate') {
        setToast({ type: 'error', message: 'This ticket has already been used.' });
      } else if (data.result === 'revoked' || data.result === 'invalid') {
        setToast({ type: 'error', message: 'This ticket is not valid for entry.' });
      } else {
        throw new Error(data.error || 'Failed to validate ticket');
      }
    } catch (err: unknown) {
      console.error('Error validating ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to validate ticket';
      setToast({ type: 'error', message });
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId || !signature) {
        setError('Invalid ticket link');
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessToken();
        if (!token) {
          setNeedsLogin(true);
          return;
        }

        const params = new URLSearchParams({ ticketId, signature });
        const res = await fetch(`/api/tickets/scan?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({})) as ScanResponse;

        if (res.status === 401) {
          setNeedsLogin(true);
          return;
        }
        if (!res.ok || !data.ticket) {
          setError(data.error || 'Failed to fetch ticket details');
          return;
        }
        setTicketData(data.ticket);
      } catch (err: unknown) {
        setError('Failed to fetch ticket details');
        console.error('Error fetching ticket:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [ticketId, signature]);

  if (needsLogin) {
    const redirect = `/validate-ticket?${searchParams.toString()}`;
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
        <div className="text-center max-w-md space-y-4">
          <p className="text-gray-900 text-lg sm:text-xl font-semibold">Sign in to check in tickets</p>
          <p className="text-gray-600">Only the event organizer can validate tickets. Sign in with the organizer account on this device to continue.</p>
          <a
            href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}
            className="inline-block py-3 px-6 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

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
  const isInvalid = ticketData.validationStatus !== 'valid';
  const event = ticketData.event;

  const statusBadge = isInvalid
    ? { className: 'bg-red-600 text-white', icon: '✕', label: `Not valid (${ticketData.validationStatus})` }
    : isScanned
      ? { className: 'bg-green-500 text-white', icon: '✓', label: 'Checked in' }
      : { className: 'bg-brand text-white', icon: '⏳', label: 'Pending Validation' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
  {toast && <Toast {...toast} onClose={() => setToast(null)} />}

  {/* Header Section */}
  <header className="flex justify-center items-center py-4 sm:py-6 border-b border-gray-200">
    <div className="flex items-center gap-3 sm:gap-4">
      <Logo
        variant="default"
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
        className={`inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold rounded-lg shadow-md ${statusBadge.className}`}
      >
        <span aria-hidden="true" className="text-lg sm:text-xl">{statusBadge.icon}</span>
        <span>{statusBadge.label}</span>
      </motion.div>
      {isScanned && ticketData.scannedAt && (
        <p className="text-sm text-gray-600">
          Checked in at {new Date(ticketData.scannedAt).toLocaleString('en-GB')}
        </p>
      )}
    </section>

    {event && (
      <div
        role="img"
        aria-label={`Banner image for ${event.title}`}
        className="relative w-full max-w-6xl h-48 sm:h-64 md:h-80 bg-cover bg-center rounded-xl overflow-hidden shadow-lg border-2 border-gray-200"
        style={{ backgroundImage: `url(${encodeURI(event.image)})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40 flex flex-col justify-center items-center text-center p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight">{event.title}</h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 mt-2">{new Date(event.startTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}, {new Date(event.startTime).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}</p>
        </div>
      </div>
    )}


    {/* Ticket and Attendee Details */}
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Ticket Information */}
      <div className="bg-white rounded-card p-6 sm:p-8 shadow-md border border-gray-200">
        <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-brand pb-3 mb-6 text-gray-900">Ticket Information</h3>
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
            className="text-lg sm:text-xl font-bold text-brand"
          />
        </div>
      </div>

      {/* Attendee Information */}
      <div className="bg-white rounded-card p-6 sm:p-8 shadow-md border border-gray-200">
        <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-brand pb-3 mb-6 text-gray-900">Attendee Details</h3>
        <div className="space-y-4 sm:space-y-5">
          <InfoField label="Name" value={ticketData.attendeeName} className="text-base sm:text-lg font-medium text-gray-900" />
          <InfoField label="Email" value={ticketData.attendeeEmail} className="text-base sm:text-lg font-medium text-gray-900" />
          {ticketData.buyerName && ticketData.buyerName !== ticketData.attendeeName && (
            <InfoField label="Purchased by" value={ticketData.buyerName} className="text-base sm:text-lg font-medium text-gray-900" />
          )}
          {ticketData.buyerPhone && (
            <InfoField label="Buyer phone" value={ticketData.buyerPhone} className="text-base sm:text-lg font-medium text-gray-900" />
          )}
        </div>
      </div>
    </section>

  <motion.button
      onClick={handleValidate}
      disabled={isScanned || isInvalid || validating}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className={`w-full max-w-md mx-auto py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg transform transition-all duration-300 ${
        isScanned || isInvalid
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-brand hover:bg-brand-dark text-white hover:scale-105 hover:shadow-xl active:scale-95'
      }`}
    >
    {isInvalid ? 'Ticket Not Valid' : isScanned ? 'Ticket Already Validated' : validating ? 'Validating…' : 'Validate Ticket Now'}
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
