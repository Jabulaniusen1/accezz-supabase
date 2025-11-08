'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Toast from '@/components/ui/Toast';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import ConfirmationModal from '@/components/ConfirmationModal';
import { FiSearch, FiTrash2, FiExternalLink } from 'react-icons/fi';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  slug: string;
  date: string;
  location: string | null;
  status: string;
  created_at: string;
  creator_email: string;
  creator_name: string | null;
  tickets_sold: number;
  revenue: number;
}

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, slug, start_time, end_time, location, address, city, status, created_at, user_id')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Get unique user IDs
      const userIds = Array.from(new Set((eventsData || []).map(e => e.user_id)));
      
      // Fetch creator emails via API
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

      // Fetch ticket types and orders for revenue calculation
      const eventIds = (eventsData || []).map(e => e.id);
      
      const { data: ticketTypes, error: ticketError } = await supabase
        .from('ticket_types')
        .select('event_id, sold, price')
        .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000']);

      if (ticketError) throw ticketError;

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('event_id, total_amount, status')
        .eq('status', 'paid')
        .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000']);

      if (ordersError) throw ordersError;

      // Calculate stats per event
      const eventStats = new Map<string, { tickets: number; revenue: number }>();
      
      (ticketTypes || []).forEach(tt => {
        const eventId = tt.event_id as string;
        const current = eventStats.get(eventId) || { tickets: 0, revenue: 0 };
        current.tickets += Number(tt.sold || 0);
        current.revenue += Number(tt.sold || 0) * Number(tt.price || 0);
        eventStats.set(eventId, current);
      });

      // Also use orders for more accurate revenue (if available)
      (orders || []).forEach(order => {
        const eventId = order.event_id as string;
        const current = eventStats.get(eventId) || { tickets: 0, revenue: 0 };
        // Use order total if higher (more accurate)
        if (Number(order.total_amount || 0) > current.revenue) {
          current.revenue = Number(order.total_amount || 0);
        }
        eventStats.set(eventId, current);
      });

      const eventsWithStats: Event[] = (eventsData || []).map(event => {
        const stats = eventStats.get(event.id) || { tickets: 0, revenue: 0 };
        return {
          id: event.id,
          title: event.title,
          slug: event.slug || event.id,
          date: event.start_time,
          location: event.location || event.address || event.city || null,
          status: event.status,
          created_at: event.created_at,
          creator_email: emailMap.get(event.user_id as string) || 'N/A',
          creator_name: nameMap.get(event.user_id as string) || null,
          tickets_sold: stats.tickets,
          revenue: stats.revenue,
        };
      });

      setEvents(eventsWithStats);
      setFilteredEvents(eventsWithStats);
    } catch (error) {
      console.error('Error fetching events:', error);
      setToast({ type: 'error', message: 'Failed to load events' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventToDelete);

      if (error) throw error;

      setToast({ type: 'success', message: 'Event deleted successfully' });
      setDeleteModalOpen(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setToast({ type: 'error', message: 'Failed to delete event' });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    let filtered = events;

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.creator_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.creator_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      );
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Skeleton height="32px" width="200px" className="mb-4" />
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton height="40px" className="flex-1" />
          </div>
        </div>
        {/* Events Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
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

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Events Management</h2>
        
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events by title, creator email, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
          />
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Creator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tickets Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {event.location || 'No location'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.creator_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {event.creator_email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {event.tickets_sold}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ₦{event.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/${event.slug}`}
                        target="_blank"
                        className="text-[#f54502] hover:text-[#d63a02]"
                        title="View Event"
                      >
                        <FiExternalLink />
                      </Link>
                      <button
                        onClick={() => {
                          setEventToDelete(event.id);
                          setDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Event"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={handleDelete}
        itemName="Event"
        message="Are you sure you want to delete this event? This will also delete all associated tickets, orders, and data. This action cannot be undone."
        confirmText="Delete Event"
        confirmButtonClass="bg-red-500 hover:bg-red-600"
      />
    </div>
  );
};

export default AdminEvents;

