"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EventList from "../components/EventList";
import Earnings from "../components/Earning";
import Notifications from "../components/Notifications";
import Setting from "../components/Setting";
import Profile from "../components/settings/Profile";
import ToggleMode from "../../components/ui/mode/toggleMode";
import Loader from "@/components/ui/loader/Loader";
import { BiMenuAltLeft, BiX, BiCalendar } from "react-icons/bi";
import { FiSettings, FiLogOut, FiBell } from "react-icons/fi";
import { Notyf } from "notyf";
import "notyf/notyf.min.css";
import { useRouter, usePathname } from "next/navigation";
import axios, { AxiosError } from "axios";
import { getSession, signOut } from "@/utils/supabaseAuth";
import ConfirmationModal from "@/components/ConfirmationModal";
import EventTypeModal from "@/components/Modal/EventType";
import Link from "next/link";
import Image from "next/image";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const notyfRef = useRef<Notyf | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isAddEventLoading, setIsAddEventLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(true);

  // Initialize Notyf and check auth
  useEffect(() => {
    if (typeof window === "undefined") return;

    notyfRef.current = new Notyf({
      duration: 3000,
      position: { x: "right", y: "top" },
      types: [
        {
          type: "success",
          background: "#4CAF50",
          dismissible: true
        },
        {
          type: "error",
          background: "#F44336",
          dismissible: true
        }
      ]
    });

    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.push("/auth/login");
          return;
        }
        const welcomeShown = localStorage.getItem("welcomeShown");
        const displayName = session.user.user_metadata?.full_name || session.user.email;
        if (displayName && welcomeShown !== "true") {
          notyfRef.current?.success(`Welcome back, ${displayName}!`);
          localStorage.setItem("welcomeShown", "true");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/auth/login");
      }
    };

    checkAuth();

    return () => {
      isMounted.current = false;
    };
  }, [router]);

  // Set up axios response interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token'); 
          localStorage.removeItem('user'); 
          router.push('/auth/login');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router]);

  // (removed unused window width tracking)

  const handleAddEvent = () => {
    setShowEventTypeModal(true);
  };
  
  const handleEventType = () => {
    setShowEventTypeModal(false);
    setIsAddEventLoading(true);
    router.push('/create-event');
  };

  const handleLogout = () => {
    setShowSessionModal(true);
  };

  const confirmLogout = async () => {
    try {
      setIsLoading(true);
      localStorage.setItem("lastVisitedPath", pathname);
      localStorage.removeItem("welcomeShown");
      await signOut();
      setShowSessionModal(false);
      setTimeout(() => router.push("/auth/login"), 500);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // const navItems = [
  //   { 
  //     id: 0, 
  //     icon: <BiCalendar size={22} className="text-blue-500" />, 
  //     label: "Events" 
  //   },
  //   { 
  //     id: 1, 
  //     icon: <span className="text-blue-500 text-[20px]">₦</span>, 
  //     label: "Earnings" 
  //   },
  //   { 
  //     id: 2, 
  //     icon: <FiBell size={20} className="text-blue-500" />, 
  //     label: "Notifications" 
  //   },
  //   { 
  //     id: 3, 
  //     icon: <FiSettings size={20} className="text-blue-500" />, 
  //     label: "Settings" 
  //   }
  // ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {isLoading && <Loader />}

      <EventTypeModal 
        isOpen={showEventTypeModal}
        onClose={() => setShowEventTypeModal(false)}
        onSelectType={handleEventType}
      />

      {/* ========================= && •HEADER• && =================== */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isSidebarOpen ? <BiX size={24} /> : <BiMenuAltLeft size={24} />}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center justify-center space-x-3 group"
          >
            <div className="relative">
              <Image
                src="/accezz logo c.png"
                alt="Accezz Logo"
                width={80}
                height={80}
                className="object-contain group-hover:scale-105 w-24 h-24 transition-transform duration-200"
                priority
              />
            </div>
          </Link>

          {/* Theme Toggle */}
          <ToggleMode />
        </div>
      </header>

      <div className="flex">
        {/* ========================= && •SIDEBAR• && =================== */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="flex flex-col h-full pt-20">
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
          <button
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
              activeTab === 0
                    ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
                style={{ borderRadius: '5px' }}
            onClick={() => setActiveTab(0)}
          >
                <BiCalendar size={20} />
                <span className="font-medium">Events</span>
          </button>

          <button
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 1
                    ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            style={{ borderRadius: '5px' }}
            onClick={() => setActiveTab(1)}
          >
                <span className="text-lg font-bold">₦</span>
                <span className="font-medium">Earnings</span>
          </button>

          <button
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 2
                    ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            style={{ borderRadius: '5px' }}
            onClick={() => setActiveTab(2)}
          >
                <FiBell size={20} />
                <span className="font-medium">Notifications</span>
          </button>

          <button
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === 3
                    ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            style={{ borderRadius: '5px' }}
            onClick={() => setActiveTab(3)}
          >
                <FiSettings size={20} />
                <span className="font-medium">Settings</span>
              </button>
            </nav>

            {/* Profile Button */}
            <div className="px-4 pb-4">
              <button
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 4
                    ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                style={{ borderRadius: '5px' }}
                onClick={() => setActiveTab(4)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Profile</span>
          </button>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                style={{ borderRadius: '5px' }}
            onClick={handleLogout}
          >
                <FiLogOut size={20} />
                <span className="font-medium">Logout</span>
          </button>
            </div>
          </div>
      </aside>

      {/* ========================= && •MAIN CONTENT• && =================== */}
        <main className="flex-1 md:ml-64">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Content Area */}
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
          >
                {activeTab === 0 && <EventList />}
                {activeTab === 1 && <Earnings />}
                {activeTab === 2 && <Notifications />}
                {activeTab === 3 && <Setting />}
                {activeTab === 4 && <Profile />}
          </motion.div>
        </AnimatePresence>
          </div>

        {/* Add Event Button */}
        <button
          onClick={handleAddEvent}
          disabled={isAddEventLoading}
            className="fixed bottom-6 right-6 px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center space-x-2 transform hover:scale-105"
        >
          {isAddEventLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
              <>
                <span className="text-lg">+</span>
                <span>Add Event</span>
              </>
          )}
        </button>
      </main>
      </div>

      {/* Session Expiration Modal */}
      <ConfirmationModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onConfirm={confirmLogout}
        itemName="Logout" 
        message="Are you sure you want to log out of your account?"
        confirmText="Logout" 
        confirmButtonClass="bg-red-500 hover:bg-red-600" 
      />
    </div>
  );
};

export default Dashboard;

