import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "./Toast";
import { motion } from "framer-motion";
import { IoMailUnreadOutline } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import { supabase } from '@/utils/supabaseClient';
import ConfirmationModal from "@/components/ConfirmationModal";


interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    isOpen: boolean;
    notificationId: string | null;
  }>({ isOpen: false, notificationId: null });
  const [toastProps, setToastProps] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  }>({
    type: "success",
    message: "",
  });

  const router = useRouter();
  const toast = useCallback(
    (type: "success" | "error" | "warning" | "info", message: string) => {
      setToastProps({ type, message });
      setShowToast(true);
    },
    []
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast("error", "Please log in to view notifications");
        router.push("/auth/login");
        return;
      }

      const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (notifErr) throw notifErr;

      const mapped: Notification[] = (notifs || []).map(n => ({
        id: n.id as string,
        title: n.title as string,
        message: n.body as string,
        isRead: !!n.read_at,
        userId: n.user_id as string,
        createdAt: n.created_at as string,
        updatedAt: n.updated_at || n.created_at as string,
      }));

      setNotifications(mapped);
      setLoading(false);
    } catch (error: unknown) {
      console.error("Error fetching notifications:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch notifications";
      toast("error", message);
      setLoading(false);
    }
  }, [router, toast]);


  // Implement debounced refresh
  useEffect(() => {
    fetchNotifications();
    const refreshInterval = setInterval(fetchNotifications, 30000); 
    return () => clearInterval(refreshInterval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      toast("success", "Notification marked as read");
    } catch (error: unknown) {
      // Revert on error
      console.log(error);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, isRead: false } : notification
        )
      );
      const message = error instanceof Error ? error.message : "Failed to mark notification as read";
      toast("error", message);
    }
  };

  const deleteNotification = async (id: string) => {
    const prevNotifs = [...notifications];
    try {
      // Optimistic update
      setNotifications(prev => prev.filter(notification => notification.id !== id));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;

      toast("success", "Notification deleted successfully");
    } catch (error: unknown) {
      console.log(error);
      // Revert on error
      setNotifications(prevNotifs);
      const message = error instanceof Error ? error.message : "Failed to delete notification";
      toast("error", message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 mt-4">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full mx-auto px-3 py-6 lg:px-6 lg:py-8 lg:max-w-6xl">
      <div className="rounded-3xl bg-white/60 dark:bg-gray-900/60 shadow-xl border border-gray-100/80 dark:border-gray-800/60 backdrop-blur-sm overflow-hidden">
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}

        <div className="px-4 py-5 sm:px-8 sm:py-7 border-b border-gray-200/80 dark:border-gray-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-orange-500/80 font-semibold">
                Inbox
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Stay on top of ticket purchases, bookings, and withdrawals.
              </p>
            </div>
            <span className="inline-flex items-center self-start sm:self-auto rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 text-xs font-medium border border-blue-100/70 dark:border-blue-800/60">
              {notifications.length} {notifications.length === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
              <IoMailUnreadOutline className="w-8 h-8 text-blue-500 dark:text-blue-300" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
              You're all caught up
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
              When there’s something new about your events, bookings, or payouts, it’ll show up here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/70 dark:divide-gray-800/70">
            {notifications
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`px-4 py-5 sm:px-8 sm:py-6 transition-colors relative overflow-hidden
              ${notification.isRead 
                ? 'bg-gray-50/60 dark:bg-gray-900/40' 
                : 'bg-white dark:bg-gray-900/80'}`}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-blue-50/40 dark:to-blue-900/10"></div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 relative">
              <span className={`flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold shadow-sm border
                ${notification.isRead 
                  ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900' 
                  : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'}`}>
                {notification.title.split(' ').map(word => word.charAt(0)).join('').slice(0,2).toUpperCase()}
              </span>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {notification.title}
            {!notification.isRead && (
              <span className="ml-2 text-xs font-medium uppercase tracking-wide text-blue-500 dark:text-blue-300">
                New
              </span>
            )}
                  </h2>
                  <time className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase">
                    {new Date(notification.createdAt).toLocaleString()}
                  </time>
                </div>

                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
            {notification.message}
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-sm hover:bg-blue-500 transition-colors"
                    >
                      <IoMailUnreadOutline className="w-4 h-4" />
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDeleteModal({
              isOpen: true,
              notificationId: notification.id
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300 transition-colors"
                  >
                    <MdDeleteOutline className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
              ))}
          </div>
        )}
        
        <ConfirmationModal
          isOpen={showDeleteModal.isOpen}
          onClose={() => setShowDeleteModal({ isOpen: false, notificationId: null })}
          onConfirm={() => {
            if (showDeleteModal.notificationId) {
              deleteNotification(showDeleteModal.notificationId);
              setShowDeleteModal({ isOpen: false, notificationId: null });
            }
          }}
          itemName="Notification"
          message="Are you sure you want to delete this notification? This action cannot be undone."
        />
      </div>
    </div>
  );
};

export default Notifications;