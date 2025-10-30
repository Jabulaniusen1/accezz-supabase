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
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast("error", error?.message || "Failed to fetch notifications");
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
    } catch (error: any) {
      // Revert on error
      console.log(error);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, isRead: false } : notification
        )
      );
      toast("error", error?.message || "Failed to mark notification as read");
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
    } catch (error: any) {
      console.log(error);
      // Revert on error
      setNotifications(prevNotifs);
      toast("error", error?.message || "Failed to delete notification");
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
    <div className="min-h-screen p-4 sm:max-w-7xl w-full mx-auto ml-0 sm:ml-3">
      <div className="rounded-2xl shadow-lg overflow-hidden ">
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white flex justify-between sm:items-center gap-3">
            <span>Notifications</span>
            <span className="text-sm bg-blue-100 text-blue-600 px-2 sm:px-3 py-1 rounded-full">
              {notifications.length} {notifications.length === 1 ? 'message' : 'messages'}
            </span>
          </h1>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <IoMailUnreadOutline className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg md:text-base sm:text-sm">No notifications available</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-2 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors
              ${notification.isRead 
                ? 'bg-gray-50/80 dark:bg-gray-800/60' 
                : 'bg-white dark:bg-gray-800'}`}
          >
            <div className="flex items-start gap-4 md:gap-6">
              <div className="flex flex-col items-center mt-2">
                {notification.isRead ? (
            <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                ) : (
            <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {notification.title}
            {notification.isRead && (
              <span className="ml-2 text-green-500 dark:text-green-400 text-sm">
                ✓ Read
              </span>
            )}
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
            {notification.message}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <time className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {new Date(notification.createdAt).toLocaleString()}
            </time>
            
            <div className="flex items-center gap-2 md:gap-3">
              {!notification.isRead && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm 
              font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 
              dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 
              rounded-full transition-colors"
                >
                  <IoMailUnreadOutline className="w-3 h-3 md:w-4 md:h-4 mr-1" />
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
                className="inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm 
                  font-medium text-red-600 bg-red-50 hover:bg-red-100 
                  dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 
                  rounded-full transition-colors"
              >
                <MdDeleteOutline className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Delete
              </button>
            </div>
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