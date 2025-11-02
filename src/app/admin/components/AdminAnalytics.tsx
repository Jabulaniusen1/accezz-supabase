'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Toast from '@/components/ui/Toast';
import { FiTrendingUp, FiDollarSign, FiCalendar, FiUsers, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  totalRevenue: number;
  totalEvents: number;
  totalUsers: number;
  totalTicketsSold: number;
  revenueByEvent: Array<{
    event_id: string;
    title: string;
    revenue: number;
    tickets_sold: number;
  }>;
  revenueByUser: Array<{
    user_id: string;
    email: string;
    name: string | null;
    revenue: number;
    events_count: number;
  }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  dailyUsers: Array<{ date: string; count: number }>;
  dailyEvents: Array<{ date: string; count: number }>;
  dailyTickets: Array<{ date: string; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Fetch all events with created_at
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, title, user_id, created_at');

        if (eventsError) throw eventsError;

        // Fetch all orders (paid) with created_at
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('event_id, total_amount, status, created_at')
          .eq('status', 'paid')
          .order('created_at', { ascending: true });

        if (ordersError) throw ordersError;

        // Fetch all ticket types for ticket count
        const { data: ticketTypes, error: ticketError } = await supabase
          .from('ticket_types')
          .select('event_id, sold');

        if (ticketError) throw ticketError;

        // Fetch all users with created_at
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, created_at')
          .order('created_at', { ascending: true });

        if (profilesError) throw profilesError;

        // Get user emails
        const userIds = Array.from(new Set((profiles || []).map(p => p.user_id)));
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        
        const emailResponse = await fetch('/api/admin/users-emails', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ user_ids: userIds }),
        });

        let emailMap = new Map<string, string>();
        let nameMap = new Map<string, string>();
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          emailMap = new Map(emailData.emails || []);
          nameMap = new Map(emailData.names || []);
        }

        // Calculate total revenue
        const totalRevenue = (orders || []).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

        // Calculate total tickets sold
        const totalTicketsSold = (ticketTypes || []).reduce((sum, tt) => sum + Number(tt.sold || 0), 0);

        // Revenue by event
        const revenueByEventMap = new Map<string, { title: string; revenue: number; tickets: number }>();
        
        (events || []).forEach(event => {
          revenueByEventMap.set(event.id, {
            title: event.title,
            revenue: 0,
            tickets: 0,
          });
        });

        (orders || []).forEach(order => {
          const eventData = revenueByEventMap.get(order.event_id as string);
          if (eventData) {
            eventData.revenue += Number(order.total_amount || 0);
          }
        });

        (ticketTypes || []).forEach(tt => {
          const eventData = revenueByEventMap.get(tt.event_id as string);
          if (eventData) {
            eventData.tickets += Number(tt.sold || 0);
          }
        });

        const revenueByEvent = Array.from(revenueByEventMap.entries())
          .map(([event_id, data]) => ({
            event_id,
            title: data.title,
            revenue: data.revenue,
            tickets_sold: data.tickets,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Revenue by user
        const revenueByUserMap = new Map<string, { events: Set<string>; revenue: number }>();

        (orders || []).forEach(order => {
          const event = events?.find(e => e.id === order.event_id);
          if (event) {
            const userId = event.user_id as string;
            const userData = revenueByUserMap.get(userId) || { events: new Set(), revenue: 0 };
            userData.events.add(event.id);
            userData.revenue += Number(order.total_amount || 0);
            revenueByUserMap.set(userId, userData);
          }
        });

        const revenueByUser = Array.from(revenueByUserMap.entries())
          .map(([user_id, data]) => ({
            user_id,
            email: emailMap.get(user_id) || 'N/A',
            name: nameMap.get(user_id) || null,
            revenue: data.revenue,
            events_count: data.events.size,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Calculate daily revenue (last 30 days)
        const dailyRevenueMap = new Map<string, number>();
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return date.toISOString().split('T')[0];
        });

        last30Days.forEach(date => dailyRevenueMap.set(date, 0));
        (orders || []).forEach(order => {
          const orderDate = new Date(order.created_at as string).toISOString().split('T')[0];
          if (dailyRevenueMap.has(orderDate)) {
            dailyRevenueMap.set(orderDate, (dailyRevenueMap.get(orderDate) || 0) + Number(order.total_amount || 0));
          }
        });

        const dailyRevenue = last30Days.map(date => ({
          date,
          revenue: dailyRevenueMap.get(date) || 0,
        }));

        // Calculate daily users (last 30 days)
        const dailyUsersMap = new Map<string, number>();
        last30Days.forEach(date => dailyUsersMap.set(date, 0));
        (profiles || []).forEach(profile => {
          const userDate = new Date(profile.created_at).toISOString().split('T')[0];
          if (dailyUsersMap.has(userDate)) {
            dailyUsersMap.set(userDate, (dailyUsersMap.get(userDate) || 0) + 1);
          }
        });

        const dailyUsers = last30Days.map(date => ({
          date,
          count: dailyUsersMap.get(date) || 0,
        }));

        // Calculate daily events (last 30 days)
        const dailyEventsMap = new Map<string, number>();
        last30Days.forEach(date => dailyEventsMap.set(date, 0));
        (events || []).forEach(event => {
          const eventDate = new Date(event.created_at as string).toISOString().split('T')[0];
          if (dailyEventsMap.has(eventDate)) {
            dailyEventsMap.set(eventDate, (dailyEventsMap.get(eventDate) || 0) + 1);
          }
        });

        const dailyEvents = last30Days.map(date => ({
          date,
          count: dailyEventsMap.get(date) || 0,
        }));

        // Calculate daily tickets (from ticket types - approximate using order dates)
        const dailyTicketsMap = new Map<string, number>();
        last30Days.forEach(date => dailyTicketsMap.set(date, 0));
        
        // Group tickets by order date
        const ticketsByDate = new Map<string, number>();
        (orders || []).forEach(order => {
          const orderDate = new Date(order.created_at as string).toISOString().split('T')[0];
          // Estimate tickets from orders (you might want to join with actual tickets table)
          const orderTickets = ticketTypes?.filter(tt => {
            const event = events?.find(e => e.id === order.event_id);
            return event && tt.event_id === event.id;
          }).reduce((sum, tt) => sum + Number(tt.sold || 0), 0) || 0;
          
          if (ticketsByDate.has(orderDate)) {
            ticketsByDate.set(orderDate, (ticketsByDate.get(orderDate) || 0) + orderTickets);
          } else {
            ticketsByDate.set(orderDate, orderTickets);
          }
        });

        const dailyTickets = last30Days.map(date => ({
          date,
          count: ticketsByDate.get(date) || 0,
        }));

        // Calculate monthly revenue (last 12 months)
        const monthlyRevenueMap = new Map<string, number>();
        const last12Months = Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (11 - i));
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        (orders || []).forEach(order => {
          const orderDate = new Date(order.created_at as string);
          const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (monthlyRevenueMap.has(monthKey)) {
            monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) || 0) + Number(order.total_amount || 0));
          } else {
            monthlyRevenueMap.set(monthKey, Number(order.total_amount || 0));
          }
        });

        const monthlyRevenue = last12Months.map(month => ({
          month,
          revenue: monthlyRevenueMap.get(month) || 0,
        }));

        setAnalytics({
          totalRevenue,
          totalEvents: events?.length || 0,
          totalUsers: profiles?.length || 0,
          totalTicketsSold,
          revenueByEvent,
          revenueByUser,
          dailyRevenue,
          dailyUsers,
          dailyEvents,
          dailyTickets,
          monthlyRevenue,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setToast({ type: 'error', message: 'Failed to load analytics data' });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Calculate growth percentages
  const calculateGrowth = (data: Array<{ revenue?: number; count?: number }>) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-7).reduce((sum, d) => sum + (d.revenue || d.count || 0), 0);
    const previous = data.slice(-14, -7).reduce((sum, d) => sum + (d.revenue || d.count || 0), 0);
    if (previous === 0) return recent > 0 ? 100 : 0;
    return ((recent - previous) / previous) * 100;
  };

  const revenueGrowth = analytics ? calculateGrowth(analytics.dailyRevenue) : 0;
  const usersGrowth = analytics ? calculateGrowth(analytics.dailyUsers) : 0;
  const eventsGrowth = analytics ? calculateGrowth(analytics.dailyEvents) : 0;
  const ticketsGrowth = analytics ? calculateGrowth(analytics.dailyTickets) : 0;

  // Chart data
  const revenueChartData = analytics ? {
    labels: analytics.dailyRevenue.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Daily Revenue',
        data: analytics.dailyRevenue.map(d => d.revenue),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const monthlyRevenueChartData = analytics ? {
    labels: analytics.monthlyRevenue.map(d => d.month),
    datasets: [
      {
        label: 'Monthly Revenue',
        data: analytics.monthlyRevenue.map(d => d.revenue),
        backgroundColor: 'rgba(245, 69, 2, 0.8)',
        borderRadius: 8,
      },
    ],
  } : null;

  const usersChartData = analytics ? {
    labels: analytics.dailyUsers.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'New Users',
        data: analytics.dailyUsers.map(d => d.count),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const eventsChartData = analytics ? {
    labels: analytics.dailyEvents.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'New Events',
        data: analytics.dailyEvents.map(d => d.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                ₦{analytics.totalRevenue.toLocaleString()}
              </p>
            </div>
            <FiDollarSign className="text-4xl text-green-500" />
          </div>
          <div className="flex items-center text-sm">
            {revenueGrowth >= 0 ? (
              <FiArrowUp className="text-green-500 mr-1" />
            ) : (
              <FiArrowDown className="text-red-500 mr-1" />
            )}
            <span className={revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(revenueGrowth).toFixed(1)}% vs last week
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Our Profit (6%)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                ₦{(analytics.totalRevenue * 0.06).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <FiDollarSign className="text-4xl text-emerald-500" />
          </div>
          <div className="flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              6% platform fee
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.totalEvents}
              </p>
            </div>
            <FiCalendar className="text-4xl text-blue-500" />
          </div>
          <div className="flex items-center text-sm">
            {eventsGrowth >= 0 ? (
              <FiArrowUp className="text-green-500 mr-1" />
            ) : (
              <FiArrowDown className="text-red-500 mr-1" />
            )}
            <span className={eventsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(eventsGrowth).toFixed(1)}% vs last week
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.totalUsers}
              </p>
            </div>
            <FiUsers className="text-4xl text-purple-500" />
          </div>
          <div className="flex items-center text-sm">
            {usersGrowth >= 0 ? (
              <FiArrowUp className="text-green-500 mr-1" />
            ) : (
              <FiArrowDown className="text-red-500 mr-1" />
            )}
            <span className={usersGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(usersGrowth).toFixed(1)}% vs last week
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tickets Sold</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.totalTicketsSold.toLocaleString()}
              </p>
            </div>
            <FiTrendingUp className="text-4xl text-yellow-500" />
          </div>
          <div className="flex items-center text-sm">
            {ticketsGrowth >= 0 ? (
              <FiArrowUp className="text-green-500 mr-1" />
            ) : (
              <FiArrowDown className="text-red-500 mr-1" />
            )}
            <span className={ticketsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(ticketsGrowth).toFixed(1)}% vs last week
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue Trend (Last 30 Days)</h3>
          <div className="h-64">
            {revenueChartData && <Line data={revenueChartData} options={chartOptions} />}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Monthly Revenue (Last 12 Months)</h3>
          <div className="h-64">
            {monthlyRevenueChartData && <Bar data={monthlyRevenueChartData} options={chartOptions} />}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">User Growth (Last 30 Days)</h3>
          <div className="h-64">
            {usersChartData && <Line data={usersChartData} options={chartOptions} />}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Event Creation (Last 30 Days)</h3>
          <div className="h-64">
            {eventsChartData && <Line data={eventsChartData} options={chartOptions} />}
          </div>
        </div>
      </div>

      {/* Top Events and Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Events by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.revenueByEvent.slice(0, 5).map((event) => (
                  <tr key={event.event_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {event.title}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                      ₦{event.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Users by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.revenueByUser.slice(0, 5).map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {user.name || user.email}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                      ₦{user.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
