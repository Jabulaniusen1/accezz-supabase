'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { Event, Ticket } from '@/types/analytics';
import Loader from '@/components/ui/loader/Loader';
import Toast from '@/components/ui/Toast';
import { AnalyticsHeader } from './components/AnalyticsHeader';
// import { EventDetails } from './components/EventDetails';
// import { StatsCard } from './components/StatsCard';
// import { QRCodeCard } from './components/QRCodeCard';
import { Filters } from './components/Filters';
import { AttendeesTable } from './components/AttendeesTable';
// import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { EmailMarketing } from './components/EmailMarketing';
// import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { FaMoneyBill, FaTicketAlt } from 'react-icons/fa';
// import { Line } from 'react-chartjs-2';

const EventAnalyticsContent = () => {
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  // const [refreshing, setRefreshing] = useState(false);
  // const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  // const [ticketStats, setTicketStats] = useState<TicketStats>({
  //   totalSold: 0,
  //   revenue: 0,
  //   soldByType: {}
  // });
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('');
  const [scannedFilter, setScannedFilter] = useState('');
  const [emailTitle, setEmailTitle] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [activeTab, setActiveTab] = useState('attendees');
  const [paymentFilter, setPaymentFilter] = useState('');

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .select('id, slug, title, description, image_url, date, time, location')
        .eq('id', eventId)
        .single();
      if (evErr) throw evErr;

      const { data: types, error: ttErr } = await supabase
        .from('ticket_types')
        .select('id, name, price, quantity, sold')
        .eq('event_id', eventId);
      if (ttErr) throw ttErr;

      const e: Event = {
        id: ev.id,
        slug: ev.slug || ev.id,
        title: ev.title,
        description: ev.description,
        image: ev.image_url,
        date: ev.date,
        location: ev.location || '',
        ticketType: (types || []).map(t => ({
          name: t.name,
          sold: String(t.sold ?? '0'),
          price: String(t.price ?? '0'),
          quantity: String(t.quantity ?? '0'),
        })),
      } ;
      setEvent(e);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load event details.' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!eventId) return;

    try {
      if (!silent) setLoading(true);
      const { data: tix, error: tErr } = await supabase
        .from('tickets')
        .select('id, order_id, ticket_type_id, attendee_name, attendee_email, price, currency, created_at, is_scanned, validation_status, qr_code_url')
        .eq('event_id', eventId);
      if (tErr) throw tErr;

      const typeIds = Array.from(new Set((tix || []).map(t => t.ticket_type_id)));
      const { data: typeRows } = await supabase
        .from('ticket_types')
        .select('id, name')
        .in('id', typeIds.length ? typeIds : ['00000000-0000-0000-0000-000000000000']);
      const typeMap = new Map<string, string>((typeRows || []).map(r => [r.id as string, r.name as string]));

      const orderIds = Array.from(new Set((tix || []).map(t => t.order_id)));
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, payment_reference, currency')
        .in('id', orderIds.length ? orderIds : ['00000000-0000-0000-0000-000000000000']);
      type OrderData = { id: string; status: string; payment_reference?: string | null; currency?: string | null };
      const orderMap = new Map<string, OrderData>((orders || []).map(o => [o.id as string, { id: o.id as string, status: o.status as string, payment_reference: o.payment_reference as string | null | undefined, currency: o.currency as string | null | undefined }]));

      const mapped: Ticket[] = (tix || []).map(t => {
        const o = orderMap.get(t.order_id as string);
        return {
          id: t.id as string,
          eventId: eventId,
          email: (t.attendee_email as string) || '',
          phone: '',
          fullName: (t.attendee_name as string) || '',
          ticketType: typeMap.get(t.ticket_type_id as string) || '',
          price: Number(t.price || 0),
          purchaseDate: t.created_at as string,
          qrCode: (t.qr_code_url as string) || '',
          paid: o ? o.status === 'paid' : false,
          currency: (t.currency as string) || (o?.currency as string) || '',
          flwRef: (o?.payment_reference as string) || '',
          attendees: [],
          validationStatus: (t.validation_status as string) || 'valid',
          isScanned: !!t.is_scanned,
          createdAt: t.created_at as string,
          updatedAt: t.created_at as string,
        };
      });

      const validTickets = mapped.filter(t => t.validationStatus === 'valid');

      setTickets(mapped);
      setFilteredTickets(validTickets);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load ticket details.';
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // const handleRefresh = useCallback(() => {
  //   fetchTickets(true);
  // }, [fetchTickets]);

  // const handleExport = useCallback(async () => {
  //   if (!filteredTickets.length) {
  //     setToast({ type: 'error', message: 'No data to export' });
  //     return;
  //   }

  //   try {
  //     setExporting(true);
  //     const headers = ['Name', 'Email', 'Ticket Type', 'Purchase Date', 'Scanned', 'Sub-Attendees'];
  //     const csvContent = [
  //       headers.join(','),
  //       ...filteredTickets.map(ticket => [
  //         `"${ticket.fullName}"`,
  //         `"${ticket.email}"`,
  //         `"${ticket.ticketType}"`,
  //         `"${new Date(ticket.purchaseDate).toLocaleDateString()}"`,
  //         `"${ticket.isScanned ? 'Yes' : 'No'}"`,
  //         `"${ticket.attendees.map(a => `${a.name} (${a.email})`).join('; ')}"`
  //       ].join(','))
  //     ].join('\n');

  //     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  //     const url = URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.setAttribute('href', url);
  //     link.setAttribute('download', `${event?.title || 'event'}_attendees_${new Date().toISOString().slice(0, 10)}.csv`);
  //     document.body.appendChild(link);
  //     link.click();
  //       document.body.removeChild(link);
      
  //     setToast({ type: 'success', message: 'Export completed successfully!' });
  //   } catch (error) {
  //     console.error('Export error:', error);
  //     setToast({ type: 'error', message: 'Failed to export data' });
  //   } finally {
  //     setExporting(false);
  //   }
  // }, [filteredTickets, event]);

  const handleSendEmail = useCallback(async () => {
    if (!emailTitle.trim() || !emailContent.trim()) {
      setToast({ type: 'error', message: 'Email title and content cannot be empty!' });
      return;
    }

    const recipients = Array.from(new Set(
      filteredTickets
        .flatMap(ticket => [ticket.email, ...ticket.attendees.map(a => a.email)])
        .filter(Boolean)
    )) as string[];

    if (!recipients.length) {
      setToast({ type: 'error', message: 'No valid email recipients found.' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: emailTitle, 
          content: emailContent, 
          recipients 
        }),
      });
      
      if (!response.ok) throw new Error();
      setToast({ type: 'success', message: `Emails sent successfully to ${recipients.length} recipients!` });
      setEmailTitle('');
      setEmailContent('');
    } catch {
      setToast({ type: 'error', message: 'Upgrade to premium version before being able to send emails to attendees..' });
    } finally {
      setLoading(false);
    }
  }, [emailTitle, emailContent, filteredTickets]);

  const handleShare = useCallback(() => {
    if (!event) return;
    
    const eventUrl = `${window.location.origin}/${event.slug}`;
    
    if (navigator.share) {
      navigator.share({ 
        title: event.title, 
        text: `Check out this event: ${event.title}`,
        url: eventUrl 
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(eventUrl)
        .then(() => setToast({ type: 'success', message: 'Event link copied to clipboard!' }))
        .catch(() => setToast({ type: 'error', message: 'Failed to copy link' }));
    } else {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = eventUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setToast({ type: 'success', message: 'Event link copied to clipboard!' });
      } catch (err) {
        console.error('Copy to clipboard failed:', err);
        setToast({ type: 'error', message: 'Failed to copy link' });
      }
      document.body.removeChild(textArea);
    }
  }, [event]);

  useEffect(() => {
    const filtered = tickets.filter(ticket => {
      const matchesValidation = ticket.validationStatus === 'valid';
      const matchesSearch = searchQuery
        ? ticket.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.attendees.some(a => 
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : true;
      const matchesType = ticketTypeFilter
        ? ticket.ticketType === ticketTypeFilter
        : true;
      const matchesScanned = scannedFilter
        ? scannedFilter === 'scanned' ? ticket.isScanned : !ticket.isScanned
        : true;
      const matchesPaymentStatus = !paymentFilter || 
        (paymentFilter === 'paid' ? ticket.paid : !ticket.paid);

      return matchesValidation && matchesSearch && matchesType && matchesScanned && matchesPaymentStatus;
    });

    setFilteredTickets(filtered);
  }, [tickets, searchQuery, ticketTypeFilter, scannedFilter, paymentFilter]);

  useEffect(() => {
    fetchEvent();
    fetchTickets();
  }, [fetchEvent, fetchTickets]);

  // const chartData = useMemo<ChartData>(() => ({
  //   labels: event?.ticketType?.map(t => t.name) || [],
  //   datasets: [
  //     {
  //       label: 'Tickets Sold',
  //       data: event?.ticketType?.map(t => parseInt(t.sold || '0')) || [],
  //       backgroundColor: ['#f59e0b'], 
  //       borderRadius: 6,
  //       borderSkipped: false,
  //     },
  //     {
  //       label: 'Revenue (₦)',
  //       data: event?.ticketType?.map(t => parseInt(t.sold || '0') * parseInt(t.price || '0')) || [],
  //       backgroundColor: ['#10b981'], 
  //       borderRadius: 6,
  //       borderSkipped: false,
  //     }
  //   ]
  // }), [event]);

  // const paidAttendeesCount = useMemo(() => 
  //   filteredTickets
  //     .filter(t => t.paid)
  //     .reduce((sum, ticket) => {
  //       const subAttendees = ticket.attendees?.length || 0;
  //       // Only count sub-attendees if there are more than 1
  //       const subAttendeesToCount = subAttendees > 1 ? subAttendees : 0;
  //       return sum + 1 + subAttendeesToCount;
  //     }, 0)
  // , [filteredTickets]);

  // Calculate total tickets sold from event data
  const totalTicketsSoldFromEvent = useMemo(() => {
    if (!event?.ticketType) return 0;
    return event.ticketType.reduce((total, ticketType) => {
      return total + parseInt(ticketType.sold || '0');
    }, 0);
  }, [event]);

  // Calculate total revenue from event data
  const totalRevenueFromEvent = useMemo(() => {
    if (!event?.ticketType) return 0;
    return event.ticketType.reduce((total, ticketType) => {
      const sold = parseInt(ticketType.sold || '0');
      const price = parseInt(ticketType.price || '0');
      return total + (sold * price);
    }, 0);
  }, [event]);

  // const statsCards = useMemo(() => [
    // {
    //   title: "🎟 Ticket Statistics",
    //   icon: "📊",
    //   borderColor: "border-yellow-500",
    //   stats: [
    //     { 
    //       label: "Total Tickets", 
    //       value: filteredTickets.length, 
    //       color: "text-gray-700 dark:text-gray-300" 
    //     },
    //     { 
    //       label: "Paid", 
    //       value: filteredTickets.filter(t => t.paid).length, 
    //       color: "text-green-600 dark:text-green-400" 
    //     },
    //     { 
    //       label: "Unpaid", 
    //       value: filteredTickets.filter(t => !t.paid).length, 
    //       color: "text-red-600 dark:text-red-400" 
    //     },
    //     { 
    //       label: "Scanned", 
    //       value: filteredTickets.filter(t => t.isScanned && t.paid).length,
    //       color: "text-blue-600 dark:text-blue-400" 
    //     },
    //     { 
    //       label: "Not Scanned", 
    //       value: filteredTickets.filter(t => !t.isScanned && t.paid).length,
    //       color: "text-orange-600 dark:text-orange-400" 
    //     }
    //   ]
    // },
    // {
    //   title: "📊 Analytics Overview",
    //   icon: "📈",
    //   borderColor: "border-blue-500",
    //   stats: [
        // { 
        //   label: "Attendees", 
        //   value: filteredTickets
        //     .filter(t => t.paid)
        //     .reduce((sum, ticket) => sum + 1 + (ticket.attendees?.length || 0), 0),
        //   color: "text-gray-700 dark:text-gray-300" 
        // },
        // { 
        //   label: "Revenue", 
        //   value: `₦${ticketStats.revenue.toLocaleString()}`, 
        //   color: "text-blue-600 dark:text-blue-400" 
        // },
        // { 
        //   label: "Payment Rate", 
        //   value: filteredTickets.length 
        //     ? `${(filteredTickets.filter(t => t.paid).length / filteredTickets.length * 100).toFixed(1)}%` 
        //     : 'N/A', 
        //   color: "text-purple-600 dark:text-purple-400" 
        // }
    //   ]
    // },
    // {
    //   title: "👥 Attendee Insights",
    //   icon: "👤",
    //   borderColor: "border-purple-500",
    //   stats: [
    //     { 
    //       label: "Avg. Attendees/Ticket", 
    //       value: filteredTickets.length 
    //         ? (ticketStats.totalSold / filteredTickets.length).toFixed(1) 
    //         : '0', 
    //       color: "text-gray-700 dark:text-gray-300" 
    //     },
    //     // { 
    //     //   label: "VIP Tickets", 
    //     //   value: filteredTickets.filter(t => t.ticketType.toLowerCase().includes('vip')).length, 
    //     //   color: "text-yellow-600 dark:text-yellow-400" 
    //     // },
    //     { 
    //       label: "Last 7 Days", 
    //       value: filteredTickets.filter(t => 
    //         new Date(t.purchaseDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    //       ).length, 
    //       color: "text-green-600 dark:text-green-400" 
    //     }
    //   ]
    // },
    // {
    //   title: "🎫 Ticket Breakdown",
    //   icon: "🎟️",
    //   borderColor: "border-indigo-500",
    //   stats: event?.ticketType?.map(ticketType => ({
    //     label: ticketType.name,
    //     value: `${ticketType.sold}/${ticketType.quantity}`,
    //     color: "text-indigo-600 dark:text-indigo-400"
    //   })) || []
    // }
  // ], [filteredTickets, ticketStats]);

  if (loading) return <Loader />;
  if (!event) return <div className="flex items-center justify-center h-screen">Event not found</div>;
    
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black min-h-screen transition-colors duration-300">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      
      <AnalyticsHeader 
        title={event.title}
        onShare={handleShare}
        eventDate={event.date}
        totalPaidAttendees={totalTicketsSoldFromEvent}
        totalRevenue={totalRevenueFromEvent}
        currency="NGN"
      />

      <div className="container mx-auto lg:px-4 px-2 py-8 space-y-8 max-w-7xl">
        {/* <EventDetails event={event} /> */}

        <div className="grid grid-cols-2 lg:gap-6 gap-2">
          {/* Total Tickets Box */}
          <div className="flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border-l-4 sm:border-l-8 border-yellow-500 w-full">
            <div className="flex flex-col xs:flex-row items-center justify-center mb-4 w-full">
              <FaTicketAlt className="w-4 h-4 sm:w-10 sm:h-10 text-yellow-500 mb-2 xs:mb-0 xs:mr-3" />
              <h3 className="text-sm sm:text-2xl  font-semibold text-gray-900 dark:text-white">Tickets Sold</h3>
            </div>
            <div className="text-lg sm:text-4xl font-extrabold text-yellow-600 dark:text-yellow-400 mb-2">
              {totalTicketsSoldFromEvent}
            </div>
            {/* <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 text-center">Tickets Sold</div> */}
          </div>
          {/* Total Revenue Box */}
          <div className="flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border-l-4 sm:border-l-8 border-green-500 w-full">
            <div className="flex flex-col xs:flex-row items-center justify-center mb-4 w-full">
              <FaMoneyBill className="w-4 h-4 sm:w-10 sm:h-10 text-green-500 mb-2 xs:mb-0 xs:mr-3" />
              <h3 className="text-sm sm:text-2xl font-semibold text-gray-900 dark:text-white text-center w-full">
                Total Revenue
              </h3>
            </div>
            <div className="text-lg sm:text-4xl font-extrabold text-green-600 dark:text-green-400 mb-2 text-center break-words">
              ₦{totalRevenueFromEvent.toLocaleString()}
            </div>
            {/* <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 text-center">Revenue Collected</div> */}
          </div>
        </div>

        {/* Stats Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statsCards.map((card, index) => (
            <div key={index} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 ${card.borderColor} transition-all duration-300 hover:shadow-xl`}>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">{card.icon}</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{card.title}</h3>
              </div>
              <div className="space-y-3">
                {card.stats.map((stat, statIndex) => (
                  <div key={statIndex} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                    <span className={`text-lg font-semibold ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div> */}

        {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="text-2xl mr-3">📊</span>
            Event Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {event?.ticketType?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Ticket Types</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {event?.ticketType?.reduce((total, t) => total + parseInt(t.quantity || '0'), 0) || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Capacity</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {event?.ticketType?.reduce((total, t) => total + parseInt(t.sold || '0'), 0) || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tickets Sold</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {event?.ticketType?.reduce((total, t) => {
                  const sold = parseInt(t.sold || '0');
                  const quantity = parseInt(t.quantity || '0');
                  return total + (quantity - sold);
                }, 0) || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
            </div>
          </div>
        </div> */}

        {/* <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      aria-label="Refresh data"
                    >
                      <FiRefreshCw className={`text-gray-700 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={handleExport}
                      disabled={exporting}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      aria-label="Export data"
                    >
                      <FiDownload className="text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
                <div className="h-80">
                  <AnalyticsDashboard chartData={chartData} />
                </div>
              </div>
            </div>
          </div>
          
          <QRCodeCard eventSlug={event.slug} />
        </div> */}

        {/* <div className="bg-white dark:bg-gray-800 p-4 rounded-lg h-80 shadow-lg  ">
          <h3 className="font-bold text-lg mb-4">Revenue Over Time</h3>
          <Line data={{
            labels: Object.keys(
              tickets.reduce((acc, ticket) => {
                const date = new Date(ticket.purchaseDate).toLocaleDateString();
                acc[date] = true;
                return acc;
              }, {} as Record<string, boolean>)
            ),
            datasets: [{
              label: 'Revenue',
              data: Object.keys(
                tickets.reduce((acc, ticket) => {
                  const date = new Date(ticket.purchaseDate).toLocaleDateString();
                  acc[date] = true;
                  return acc;
                }, {} as Record<string, boolean>)
              ).map(date =>
                tickets
                  .filter(ticket => new Date(ticket.purchaseDate).toLocaleDateString() === date)
                  .reduce((sum, ticket) => sum + ticket.price, 0)
              ),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
          }} />
        </div> */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl mt-5">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('attendees')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'attendees' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Attendees
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'email' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Email Marketing
              </button>
            </nav>
          </div>
          
          <div className="lg:p-6">
            {activeTab === 'attendees' ? (
              <>
                <Filters
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  ticketTypeFilter={ticketTypeFilter}
                  setTicketTypeFilter={setTicketTypeFilter}
                  scannedFilter={scannedFilter}
                  setScannedFilter={setScannedFilter}
                  paymentFilter={paymentFilter}
                  setPaymentFilter={setPaymentFilter}
                  ticketTypes={event.ticketType}
                  onReset={() => {
                    setSearchQuery('');
                    setTicketTypeFilter('');
                    setScannedFilter('');
                  }}
                />
                <div className="mt-6">
                  <AttendeesTable tickets={filteredTickets} />
                </div>
              </>
            ) : (
              <EmailMarketing
                emailTitle={emailTitle}
                setEmailTitle={setEmailTitle}
                emailContent={emailContent}
                setEmailContent={setEmailContent}
                onSendEmail={handleSendEmail}
              />
            )}
          </div>
        </div>

        <div className="relative border-2 border-yellow-400 rounded-2xl p-8 bg-gradient-to-br from-yellow-50 via-amber-100 to-amber-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-700 shadow-xl overflow-hidden mt-10">
          {/* Glow and badge */}
          <div className="absolute -top-8 -right-8">
            <span className="inline-flex items-center px-4 py-1 rounded-full text-base font-bold bg-yellow-500 text-white shadow-lg animate-pulse">
              <svg className="w-5 h-5 mr-1 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
              Early Access
            </span>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="mb-4 md:mb-0 max-w-lg">
              <h3 className="font-extrabold text-2xl text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                <svg className="w-7 h-7 text-yellow-500 animate-bounce" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 01.894.553l2.382 4.823 5.326.773a1 1 0 01.554 1.706l-3.853 3.757.91 5.308a1 1 0 01-1.451 1.054L10 16.347l-4.77 2.507a1 1 0 01-1.451-1.054l.91-5.308L.836 9.855a1 1 0 01.554-1.706l5.326-.773L9.118 2.553A1 1 0 0110 2z" /></svg>
                Unlock Premium Analytics
              </h3>
              <p className="text-gray-700 dark:text-gray-200 mt-2 text-lg font-medium">
                <span className="bg-yellow-200 dark:bg-yellow-900 px-2 py-0.5 rounded text-yellow-800 dark:text-yellow-200 font-semibold">
                  Limited-time offer!
                </span>
                <br />
                <span className="text-base font-normal">
                  Supercharge your events with advanced tools:
                </span>
              </p>
              <ul className="mt-4 space-y-2 text-gray-700 dark:text-gray-200 text-base">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Send unlimited emails & announcements to attendees
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Deep attendee demographics & insights
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Priority support & instant ticket exports
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  VIP badge for your events (boosts trust)
                </li>
              </ul>
              <div className="mt-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-500 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4" /></svg>
                <span className="text-yellow-700 dark:text-yellow-300 font-semibold">
                  Only a few spots left this month!
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:to-yellow-600 text-white text-lg font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-300 animate-pulse"
                onClick={() => window.location.href = '/pricing'}
              >
                Upgrade Now &rarr;
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                30-day money-back guarantee · Cancel anytime
              </span>
              <span className="inline-flex items-center text-green-600 dark:text-green-400 text-xs font-medium">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Trusted by 2,000+ organizers
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <EventAnalyticsContent />
    </Suspense>
  );
}