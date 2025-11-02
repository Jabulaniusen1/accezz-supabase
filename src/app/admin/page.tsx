'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { getSession } from '@/utils/supabaseAuth';
import Toast from '@/components/ui/Toast';
import AdminUsers from './components/AdminUsers';
import { FiUsers, FiCalendar, FiTrendingUp, FiLogOut, FiUser, FiX, FiMenu } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import AdminAnalytics from './components/AdminAnalytics';
import AdminEvents from './components/AdminEvents';
import { Skeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';

type AdminTab = 'users' | 'events' | 'analytics';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Check if user is admin
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin, full_name')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;

        if (!profile?.is_admin) {
          setToast({ type: 'error', message: 'Access denied. Admin privileges required.' });
          setTimeout(() => router.push('/dashboard'), 2000);
          return;
        }
        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check error:', error);
        setToast({ type: 'error', message: 'Failed to verify admin access' });
        setTimeout(() => router.push('/dashboard'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar Skeleton */}
        <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex flex-col h-full pt-6 px-4 space-y-4">
            <Skeleton height="40px" width="120px" className="mb-6" />
            <Skeleton height="48px" className="mb-2" />
            <Skeleton height="48px" className="mb-2" />
            <Skeleton height="48px" className="mb-2" />
          </div>
        </aside>
        {/* Main Content Skeleton */}
        <main className="flex-1 md:ml-64 p-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <Skeleton height="32px" width="200px" className="mb-2" />
              <Skeleton height="20px" width="300px" />
            </div>
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="flex flex-col h-full pt-6">
            {/* Logo */}
            <div className="px-4 pb-6">
              <Link href="/" className="flex items-center group">
                <Image
                  src="/accezz logo c.png"
                  alt="Accezz Logo"
                  width={120}
                  height={120}
                  className="object-contain group-hover:scale-105 transition-transform duration-200"
                  priority
                />
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              <button
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
                  activeTab === 'analytics'
                    ? 'bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={{ borderRadius: '5px' }}
                onClick={() => setActiveTab('analytics')}
              >
                <FiTrendingUp size={20} />
                <span className="font-medium">Analytics</span>
              </button>

              <button
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
                  activeTab === 'users'
                    ? 'bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={{ borderRadius: '5px' }}
                onClick={() => setActiveTab('users')}
              >
                <FiUsers size={20} />
                <span className="font-medium">Users</span>
              </button>

              <button
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
                  activeTab === 'events'
                    ? 'bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={{ borderRadius: '5px' }}
                onClick={() => setActiveTab('events')}
              >
                <FiCalendar size={20} />
                <span className="font-medium">Events</span>
              </button>
            </nav>

            {/* Profile Button */}
            <div className="px-4 pb-4">
              <button
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ borderRadius: '5px' }}
                onClick={() => router.push('/dashboard')}
              >
                <FiUser size={20} />
                <span className="font-medium">Profile</span>
              </button>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                style={{ borderRadius: '5px' }}
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (!error) router.push('/auth/login');
                }}
              >
                <FiLogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Mobile Menu Button */}
          <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm md:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
              <Link href="/" className="flex items-center">
                <Image
                  src="/accezz logo c.png"
                  alt="Accezz Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </Link>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>

          {/* Welcome Header */}
          <div className="bg-white sticky top-0 z-40 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="px-6 py-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome, Boss! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor and manage your platform from the admin dashboard
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'analytics' && <AdminAnalytics />}
                {activeTab === 'users' && <AdminUsers />}
                {activeTab === 'events' && <AdminEvents />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

