"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EventList from "../components/EventList";
import Earnings from "../components/Earning";
import Notifications from "../components/Notifications";
import Setting from "../components/Setting";
import ToggleMode from "../../components/ui/mode/toggleMode";
import Loader from "@/components/ui/loader/Loader";
import { BiMenuAltLeft, BiX, BiCalendar } from "react-icons/bi";
import { FiSettings, FiLogOut, FiBell } from "react-icons/fi";
import { Notyf } from "notyf";
import "notyf/notyf.min.css";
import { useRouter, usePathname } from "next/navigation";
import axios, { AxiosError } from "axios";
import ConfirmationModal from "@/components/ConfirmationModal";
import EventTypeModal from "@/components/Modal/EventType";
import Link from "next/link";
import { FaTicketAlt } from "react-icons/fa";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
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
        const user = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!user || !token) {
          router.push("/auth/login");
          return;
        }

        const parsedUser = JSON.parse(user);
        const welcomeShown = localStorage.getItem("welcomeShown");

        if (parsedUser.fullName && welcomeShown !== "true") {
          notyfRef.current?.success(`Welcome back, ${parsedUser.fullName}!`);
          localStorage.setItem("welcomeShown", "true");
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("welcomeShown");
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

  // Track window width
  useEffect(() => {
    const updateWidth = () => {
      if (isMounted.current) {
        setWindowWidth(window.innerWidth);
      }
    };

    if (typeof window !== "undefined") {
      updateWidth();
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, []);

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

  const confirmLogout = () => {
    try {
      setIsLoading(true);
      localStorage.setItem("lastVisitedPath", pathname);
      localStorage.removeItem("token");
      localStorage.removeItem("user"); 
      localStorage.removeItem("welcomeShown");
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
    <div className="min-h-screen flex flex-col md:flex-row bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300">
      {isLoading && <Loader />}
      <header className="fixed top-0 right-0 p-4 z-20">
        <ToggleMode />
      </header>

      <EventTypeModal 
        isOpen={showEventTypeModal}
        onClose={() => setShowEventTypeModal(false)}
        onSelectType={handleEventType}
      />

      {/* ========================= && •SIDEBAR• && =================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 p-4 transform bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-600
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0 md:hover:w-64"
          }
          ${isSidebarOpen ? "w-64 " : "w-16"}
          transition-transform sm:duration-300 sm:ease-linear lg:duration-[400ms] lg:ease-in-out`}
        onMouseEnter={() => !isSidebarOpen && setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <div className="flex items-center justify-center mb-6">
          <span
            className={`text-xl font-semibold truncate ${
              isSidebarOpen ? "block" : "hidden md:block"
            }`}
          >
            {isSidebarOpen ? <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <FaTicketAlt className="w-6 h-6 text-[#f54502] dark:text-[#f54502] group-hover:text-[#f54502]/80 dark:group-hover:text-[#f54502]/80 transition-colors" />
              <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-[#f54502] dark:group-hover:text-[#f54502] transition-colors">
                Accezz
              </span>
            </Link>
            </div> : <span className="ml-2"> T </span>}
          </span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-500 dark:text-gray-300 md:hidden"
          >
            {isSidebarOpen ? <BiX size={24} /> : <BiMenuAltLeft size={24} />}
          </button>
        </div>

        {/* ========================= && •TABS• && =================== */}
        <nav className="flex flex-col space-y-2 center">
          <button
            className={`relative group flex items-center space-x-2 py-2 px-4 transition-all duration-300 rounded-lg ${
              activeTab === 0
                ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
            onClick={() => setActiveTab(0)}
          >
            {isSidebarOpen ? (
              <span className="flex items-center space-x-2">
                <BiCalendar size={24} className="inline text-[#f54502]" />
                <span>Events</span>
              </span>
            ) : (
              <span className="flex items-center justify-center ml-[-.7rem]">
                <BiCalendar size={24} className="text-blue-500" />
              </span>
            )}
          </button>

          <button
            className={`relative group flex items-center space-x-2 py-2 px-4 transition-all duration-300 rounded-lg ${
              activeTab === 1
                ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
            onClick={() => setActiveTab(1)}
          >
            {isSidebarOpen ? (
              <span className="flex items-center space-x-2">
                <span className="inline text-[#f54502] text-[20px]">₦ </span>
                <span>Earnings</span>
              </span>
            ) : (
              <span className="flex items-center justify-center ml-[-.57rem]">
                <span className="inline text-[#f54502] text-[20px]">₦ </span>
              </span>
            )}
          </button>

          <button
            className={`relative group flex items-center space-x-2 py-2 px-4 transition-all duration-300 rounded-lg ${
              activeTab === 2
                ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
            onClick={() => setActiveTab(2)}
          >
            {isSidebarOpen ? (
              <span className="flex items-center space-x-2">
                <FiBell size={22} className="inline text-[#f54502]" />
                <span>Notifications</span>
              </span>
            ) : (
              <span className="flex items-center justify-center ml-[-.7rem]">
                <FiBell size={22} className="text-blue-500" />
              </span>
            )}
          </button>

          <button
            className={`relative group flex items-center space-x-2 py-2 px-4 transition-all duration-300 rounded-lg ${
              activeTab === 3
                ? "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
            onClick={() => setActiveTab(3)}
          >
            {isSidebarOpen ? (
              <span className="flex items-center space-x-2">
                <FiSettings size={22} className="inline text-[#f54502]" />
                <span>Settings</span>
              </span>
            ) : (
              <span className="flex items-center justify-center ml-[-.7rem]">
                <FiSettings size={22} className="text-blue-500" />
              </span>
            )}
          </button>

          <button
            className="relative group flex items-center space-x-2 py-2 px-4 transition-all duration-300 rounded-lg"
            onClick={handleLogout}
          >
            {isSidebarOpen ? (
              <span className="flex items-center space-x-2">
                <FiLogOut size={22} className="inline text-red-500" />
                <span>Logout</span>
              </span>
            ) : (
              <span className="flex items-center justify-center ml-[-.7rem]">
                <FiLogOut size={22} className="text-red-500" />
              </span>
            )}
          </button>
        </nav>
      </aside>

      {/* ========================= && •MAIN CONTENT• && =================== */}
      <main
        className={`flex-grow p-6 transition-all duration-300 ${
          isSidebarOpen ? "opacity-50 md:opacity-100" : ""
        }`}
        style={{
          marginLeft: isSidebarOpen
            ? windowWidth && windowWidth >= 768
              ? "13rem"
              : "0rem"
            : windowWidth && windowWidth <= 767
            ? "0rem"
            : "0rem",
        }}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed top-4 left-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white z-10"
        >
          {isSidebarOpen ? <BiX size={24} /> : <BiMenuAltLeft size={24} />}
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === 0 && <EventList />}
            {activeTab === 1 && <Earnings />}
            {activeTab === 2 && <Notifications />}
            {activeTab === 3 && <Setting />}
          </motion.div>
        </AnimatePresence>

        {/* Add Event Button */}
        <button
          onClick={handleAddEvent}
          disabled={isAddEventLoading}
          className="fixed bottom-6 right-6 px-6 py-2 bg-[#f54502] text-white rounded-full shadow-lg hover:bg-[#f54502]/90 transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
        >
          {isAddEventLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <span>+ Add Event</span>
          )}
        </button>


      </main>

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

