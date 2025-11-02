'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Toast from '@/components/ui/Toast';
import { FiSearch, FiCheck, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';

interface User {
  user_id: string;
  full_name: string | null;
  email: string;
  verified: boolean;
  created_at: string;
  events_count: number;
  total_revenue: number;
  phone: string | null;
  country: string | null;
  currency: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  bank_code: string | null;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles - Supabase has a default limit of 1000, so we'll fetch in batches if needed
      let allProfiles: any[] = [];
      let hasMore = true;
      let from = 0;
      const pageSize = 1000;
      let fetchError: any = null;

      while (hasMore) {
        const { data: profilesBatch, error: batchError } = await supabase
          .from('profiles')
          .select('user_id, full_name, verified, created_at, phone, country, currency, account_name, account_number, bank_name, bank_code')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (batchError) {
          fetchError = batchError;
          break;
        }

        if (profilesBatch && profilesBatch.length > 0) {
          allProfiles = [...allProfiles, ...profilesBatch];
          from += pageSize;
          hasMore = profilesBatch.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (fetchError) throw fetchError;

      const profiles = allProfiles;

      // Fetch user emails from auth.users (we need to use service role for this)
      // For now, we'll get emails from a separate query or use a view
      // Since we can't directly query auth.users from client, we'll create an API route
      const userIds = profiles?.map(p => p.user_id) || [];
      
      // Fetch events count and revenue per user
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, user_id');

      if (eventsError) throw eventsError;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('event_id, total_amount, status')
        .eq('status', 'paid');

      if (ordersError) throw ordersError;

      // Calculate stats per user
      const userStats = new Map<string, { events: number; revenue: number }>();
      
      (eventsData || []).forEach(event => {
        const userId = event.user_id as string;
        const current = userStats.get(userId) || { events: 0, revenue: 0 };
        current.events += 1;
        userStats.set(userId, current);
      });

      (ordersData || []).forEach(order => {
        const eventId = order.event_id as string;
        const event = eventsData?.find(e => e.id === eventId);
        if (event) {
          const userId = event.user_id as string;
          const current = userStats.get(userId) || { events: 0, revenue: 0 };
          current.revenue += Number(order.total_amount || 0);
          userStats.set(userId, current);
        }
      });

      // Fetch emails via API route since we can't access auth.users directly
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

      const usersWithStats: User[] = (profiles || []).map(profile => {
        const stats = userStats.get(profile.user_id) || { events: 0, revenue: 0 };
        // Prioritize full_name from profiles table, fallback to name from API if profiles is null
        const displayName = profile.full_name || nameMap.get(profile.user_id) || null;
        // Handle verification - check for true boolean (not null, undefined, or false)
        const isVerified = profile.verified === true || profile.verified === 'true';
        return {
          user_id: profile.user_id,
          full_name: displayName,
          email: emailMap.get(profile.user_id) || 'N/A',
          verified: isVerified,
          created_at: profile.created_at,
          events_count: stats.events,
          total_revenue: stats.revenue,
          phone: profile.phone || null,
          country: profile.country || null,
          currency: profile.currency || null,
          account_name: profile.account_name || null,
          account_number: profile.account_number || null,
          bank_name: profile.bank_name || null,
          bank_code: profile.bank_code || null,
        };
      });

      setUsers(usersWithStats);
      setFilteredUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
      setToast({ type: 'error', message: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserEvents = async (userId: string) => {
    try {
      setLoadingEvents(true);
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, slug, date, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get ticket sales for each event
      const eventIds = (events || []).map(e => e.id);
      const { data: ticketTypes, error: ticketError } = await supabase
        .from('ticket_types')
        .select('event_id, sold, price')
        .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000']);

      if (ticketError) throw ticketError;

      const eventsWithSales = (events || []).map(event => {
        const tickets = (ticketTypes || []).filter(tt => tt.event_id === event.id);
        const totalSold = tickets.reduce((sum, t) => sum + Number(t.sold || 0), 0);
        const revenue = tickets.reduce((sum, t) => sum + (Number(t.sold || 0) * Number(t.price || 0)), 0);
        return {
          ...event,
          tickets_sold: totalSold,
          revenue,
        };
      });

      setUserEvents(eventsWithSales);
    } catch (error) {
      console.error('Error fetching user events:', error);
      setToast({ type: 'error', message: 'Failed to load user events' });
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      );
    }

    // Apply verification filter
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(user => user.verified);
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(user => !user.verified);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, verificationFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Skeleton height="32px" width="200px" className="mb-4" />
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton height="40px" className="flex-1" />
            <Skeleton height="40px" width="150px" />
          </div>
        </div>
        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <TableSkeleton />
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Users Management</h2>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
            />
          </div>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as 'all' | 'verified' | 'unverified')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || 'No name'} {/* Display full_name from profiles table */}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user.events_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ₦{user.total_revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedUserDetails(user);
                          setShowUserDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => {
                          if (selectedUser === user.user_id) {
                            setSelectedUser(null);
                            setUserEvents([]);
                          } else {
                            setSelectedUser(user.user_id);
                            fetchUserEvents(user.user_id);
                          }
                        }}
                        className="text-[#f54502] hover:text-[#d63a02]"
                        title="View Events"
                      >
                        {selectedUser === user.user_id ? (
                          <FiEyeOff className="inline" />
                        ) : (
                          <FiEye className="inline" />
                        )}
                        {' '}Events
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                User Details - {selectedUserDetails.full_name || selectedUserDetails.email}
              </h3>
              <button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUserDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Country</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1 capitalize">{selectedUserDetails.country || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Verification Status</label>
                    <p className="mt-1">
                      {selectedUserDetails.verified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <FiCheck className="mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <FiX className="mr-1" />
                          Unverified
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Joined</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {formatDistanceToNow(new Date(selectedUserDetails.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              {(selectedUserDetails.account_number || selectedUserDetails.bank_name) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Account Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Name</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.account_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Number</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {selectedUserDetails.account_number && typeof selectedUserDetails.account_number === 'string' && selectedUserDetails.account_number.length >= 4
                          ? `****${selectedUserDetails.account_number.slice(-4)}`
                          : selectedUserDetails.account_number || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bank Name</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.bank_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Currency</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.currency || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events Created</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUserDetails.events_count}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">₦{selectedUserDetails.total_revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Events Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Events by {filteredUsers.find(u => u.user_id === selectedUser)?.full_name || 'User'}
              </h3>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserEvents([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-6">
              {loadingEvents ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : userEvents.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No events found for this user.
                </p>
              ) : (
                <div className="space-y-4">
                  {userEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {event.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(event.date).toLocaleDateString()} • {event.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.tickets_sold} tickets sold
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ₦{event.revenue.toLocaleString()} revenue
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

