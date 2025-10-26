'use client';
import React from "react";
import { useMemo, useCallback, useState } from "react";
import { FaMoneyBillWave, FaChartLine, FaChartBar, FaChartPie } from "react-icons/fa";
import { BiMoneyWithdraw } from "react-icons/bi";
import { Bar, Line, Pie } from "react-chartjs-2";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Toast } from "./Toast";
import { BASE_URL } from '../../../config';
import { Event } from '@/types/event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';

const queryClient = new QueryClient();

const Earnings = () => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  }>({
    type: "success",
    message: "",
  });

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement
  );

  // Memoized toast function
  const showToastMessage = useCallback((type: "success" | "error" | "warning" | "info", message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);

  // Error handler
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    let errorMessage = defaultMessage;
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    showToastMessage('error', errorMessage);
  }, [showToastMessage]);

  // Fetch events data with React Query
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['userEvents'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        showToastMessage('error', "Please log in to view earnings");
        router.push("/auth/login");
        return [];
      }

      try {
        const response = await axios.get(`${BASE_URL}api/v1/events/my-events`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data?.events || [];
      } catch (err) {
        handleError(err, "Failed to fetch events");
        return [];
      }
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Format currency with memoization
  const formatCurrency = useCallback((amount: number) => {
    if (isNaN(amount)) return "₦0";
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  // Calculate total earnings with memoization
  const totalEarnings = useMemo(() => {
    return events?.reduce((total, event) => {
      return total + (event.ticketType?.reduce((subtotal, ticket) => {
        return subtotal + (parseFloat(ticket.price) * parseFloat(ticket.sold));
      }, 0) || 0);
    }, 0) || 0;
  }, [events]);

  // Process chart data with memoization
  const chartData = useMemo(() => {
    const monthlyRevenue = new Array(12).fill(0);
    const monthlyUsers = new Array(12).fill(0);

    events?.forEach(event => {
      const eventDate = event.createdAt ? new Date(event.createdAt) : new Date();
      const month = eventDate.getMonth();
      
      const revenue = event.ticketType.reduce((total, ticket) => 
        total + (parseFloat(ticket.price) * parseFloat(ticket.sold)), 0);
      
      const attendees = event.ticketType.reduce((total, ticket) => 
        total + parseFloat(ticket.sold), 0);
      
      monthlyRevenue[month] += revenue;
      monthlyUsers[month] += attendees;
    });

    return {
      revenue: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [{
          label: "Monthly Revenue (₦)",
          data: monthlyRevenue,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.3)",
          tension: 0.4,
        }]
      },
      users: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [{
          label: "Attendees",
          data: monthlyUsers,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
        }]
      }
    };
  }, [events]);

  // Handle row expansion
  const toggleExpandRow = useCallback((index: number) => {
    setExpandedRows(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }, []);

  // Handle event selection for pie chart
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const pieChartData = useMemo(() => {
    if (!selectedEventId) return null;
    const event = events?.find(e => e.id === selectedEventId);
    if (!event) return null;

    return {
      labels: event.ticketType.map(t => t.name),
      datasets: [{
        data: event.ticketType.map(t => parseFloat(t.sold)),
        backgroundColor: [
          "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
          "#ec4899", "#14b8a6", "#f97316", "#64748b", "#a855f7"
        ],
      }]
    };
  }, [selectedEventId, events]);

  // Empty state
  if (!isLoading && (!events || events.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="max-w-md mx-auto">
          <FaMoneyBillWave className="mx-auto text-6xl text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            No Earnings Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You haven&apos;t created any events yet. Start by creating your first event to see earnings.
          </p>
          <button
            onClick={() => router.push('/create-event')}
            className="px-6 py-3 bg-[#f54502] hover:bg-[#f54502]/90 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            Create Your First Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
          <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Earnings Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Track your revenue and ticket sales performance
        </p>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
            <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
            <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>
          <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* Earnings Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Earnings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-[#f54502]">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#f54502]/10 dark:bg-[#f54502]/20">
                  <FaMoneyBillWave className="text-[#f54502] dark:text-[#f54502] text-2xl" />
                </div>
                <div>
                  <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Earnings</h3>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatCurrency(totalEarnings)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Your lifetime earnings from all events
              </p>
            </div>

            {/* Events Count Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <FaChartLine className="text-green-600 dark:text-green-400 text-2xl" />
                </div>
                <div>
                  <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Events</h3>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {events?.length || 0}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Number of events you&apos;ve created
              </p>
            </div>

            {/* Average Earnings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-[#f54502]">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#f54502]/10 dark:bg-[#f54502]/20">
                  <FaChartBar className="text-[#f54502] dark:text-[#f54502] text-2xl" />
                </div>
                <div>
                  <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Avg. per Event</h3>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatCurrency(events?.length ? totalEarnings / events.length : 0)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Average earnings per event
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Monthly Revenue
                </h3>
                <div className="p-2 rounded-full bg-[#f54502]/10 dark:bg-[#f54502]/20">
                  <FaChartBar className="text-[#f54502] dark:text-[#f54502]" />
                </div>
              </div>
              <div className="h-64">
                <Bar 
                  data={chartData.revenue} 
                  options={{ 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `₦${context.raw?.toLocaleString()}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value) => `₦${Number(value).toLocaleString()}`
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Attendees Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Monthly Attendees
                </h3>
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <FaChartLine className="text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="h-64">
                <Line 
                  data={chartData.users} 
                  options={{ 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Ticket Sales Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Event Earnings Breakdown
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click on an event to see detailed ticket sales
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tickets Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {events?.map((event, index) => {
                    const eventRevenue = event.ticketType.reduce((total, ticket) => 
                      total + (parseFloat(ticket.price) * parseFloat(ticket.sold)), 0);
                    const ticketsSold = event.ticketType.reduce((total, ticket) => 
                      total + parseFloat(ticket.sold), 0);
                    const eventDate = event.createdAt ? new Date(event.createdAt).toLocaleDateString() : "N/A";

                    return (
                      <React.Fragment key={event.id}>
                        <tr 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${expandedRows.includes(index) ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                          onClick={() => toggleExpandRow(index)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {event.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {event.venue}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {eventDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(eventRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {ticketsSold}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-[#f54502] dark:text-[#f54502] hover:text-[#f54502]/80 dark:hover:text-[#f54502]/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandRow(index);
                              }}
                            >
                              {expandedRows.includes(index) ? 'Hide' : 'View'} Details
                            </button>
                          </td>
                        </tr>
                        {expandedRows.includes(index) && (
                          <tr className="bg-gray-50 dark:bg-gray-700">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                                <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-white">
                                  Ticket Sales Breakdown
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead>
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                          Ticket Type
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                          Price
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                          Sold
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                          Revenue
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {event.ticketType.map((ticket, i) => (
                                        <tr key={i}>
                                          <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                                            {ticket.name}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                            {formatCurrency(parseFloat(ticket.price))}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                            {ticket.sold}
                                          </td>
                                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(parseFloat(ticket.price) * parseFloat(ticket.sold))}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ticket Distribution Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Ticket Type Distribution
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Visual breakdown of ticket sales by type
                </p>
              </div>
              <div className="p-2 rounded-full bg-[#f54502]/10 dark:bg-[#f54502]/20">
                <FaChartPie className="text-[#f54502] dark:text-[#f54502]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Event
                </label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  <option value="">Choose an event...</option>
                  {events?.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
                {selectedEventId && pieChartData && (
                  <div className="mt-4 space-y-2">
                    {pieChartData.labels.map((label, i) => (
                      <div key={i} className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ 
                            backgroundColor: pieChartData.datasets[0].backgroundColor[i] 
                          }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {label}: {pieChartData.datasets[0].data[i]} sold
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2 h-64 flex items-center justify-center">
                {selectedEventId && pieChartData ? (
                  <Pie
                    data={pieChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            padding: 20,
                            font: {
                              size: 12
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FaChartPie className="mx-auto text-4xl text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      No Event Selected
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">
                      Select an event from the dropdown to view ticket distribution
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Withdraw Button */}
          <div className="text-center">
            <button
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white font-medium rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:ring-offset-2"
              onClick={() => showToastMessage('info', "Withdrawal feature coming soon!")}
            >
              <BiMoneyWithdraw className="mr-2 text-xl" />
              Withdraw Earnings
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default function EarningsWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Earnings />
    </QueryClientProvider>
  );
}