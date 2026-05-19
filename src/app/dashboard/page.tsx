"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import EventList from "../components/EventList";
import Earnings from "../components/Earning";
import Withdrawals from "../components/Withdrawals";
import Notifications from "../components/Notifications";
import Setting from "../components/Setting";
import Profile from "../components/settings/Profile";
import LocationManager from "../components/LocationManager";
import LocationBookings from "../components/LocationBookings";
import CustomerTickets from "../components/CustomerTickets";
import AffiliateSection from "../components/AffiliateSection";
import SavedEvents from "../components/SavedEvents";
import ToggleMode from "../../components/ui/mode/toggleMode";
import { useRouter, usePathname } from "next/navigation";
import { getSession, signOut } from "@/utils/supabaseAuth";
import { supabase } from "@/utils/supabaseClient";
import ConfirmationModal from "@/components/ConfirmationModal";
import EventTypeModal from "@/components/Modal/EventType";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import {
  BsBell,
  BsBookmark,
  BsCalendar2Event,
  BsGear,
  BsPerson,
  BsTicketPerforated,
} from "react-icons/bs";
import {
  BiMenuAltLeft,
  BiX,
  BiMoneyWithdraw,
  BiLogOut,
} from "react-icons/bi";
import { GiTakeMyMoney } from "react-icons/gi";
import { MdOutlineLocationCity } from "react-icons/md";
import { RiCalendarCheckLine } from "react-icons/ri";
import { Link2, Plus } from "lucide-react";

// ── Tab IDs ───────────────────────────────────────────────────────────────────
const TAB = {
  EVENTS: 0,
  EARNINGS: 1,
  NOTIFICATIONS: 2,
  SETTINGS: 3,
  PROFILE: 4,
  WITHDRAWALS: 5,
  LOCATIONS: 6,
  BOOKINGS: 7,
  MY_TICKETS: 8,
  TICKETS_SOLD: 9,
  AFFILIATES: 10,
  SAVED_EVENTS: 11,
} as const;

type TabId = (typeof TAB)[keyof typeof TAB];

// ── Nav item helper ───────────────────────────────────────────────────────────
interface NavItemProps {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  activeTab: TabId;
  onClick: (id: TabId) => void;
}

function NavItem({ id, label, icon, activeTab, onClick }: NavItemProps) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? "bg-[#f54502]/10 text-[#f54502]"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? "text-[#f54502]" : ""}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function NavSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
      {label}
    </p>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabId>(TAB.MY_TICKETS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isAddEventLoading, setIsAddEventLoading] = useState(false);
  const [userType, setUserType] = useState<"creator" | "customer">("customer");
  const [userName, setUserName] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.push("/auth/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type, full_name")
          .eq("user_id", session.user.id)
          .single();

        const type = (profile?.user_type as "creator" | "customer") || "customer";
        setUserType(type);
        setUserName(
          profile?.full_name ||
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "User"
        );

        // Default tab: creators see Events, customers see My Tickets
        setActiveTab(type === "creator" ? TAB.EVENTS : TAB.MY_TICKETS);
        setIsLoading(false);
      } catch {
        router.push("/auth/login");
      }
    };

    checkAuth();
    return () => {
      isMounted.current = false;
    };
  }, [router]);

  const navigate = (id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false); // always close sidebar on mobile
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      localStorage.setItem("lastVisitedPath", pathname);
      localStorage.removeItem("welcomeShown");
      await signOut();
      setShowLogoutModal(false);
      setTimeout(() => router.push("/auth/login"), 400);
    } catch {
      setIsLoading(false);
    }
  };

  const isCreator = userType === "creator";

  const sidebar = (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-800">
        <Link href="/" className="flex items-center">
          <Logo variant="default" width={80} height={80} className="w-20 h-20 object-contain" priority />
        </Link>
        <button
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setSidebarOpen(false)}
        >
          <BiX size={20} />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#f54502]/10 flex items-center justify-center flex-shrink-0">
            <BsPerson size={18} className="text-[#f54502]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-[11px] text-gray-400 capitalize">{userType}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {/* Customer section — always visible */}
        <NavSection label="My Account" />
        <NavItem id={TAB.MY_TICKETS} label="My Tickets" icon={<BsTicketPerforated size={17} />} activeTab={activeTab} onClick={navigate} />
        <NavItem id={TAB.SAVED_EVENTS} label="Saved Events" icon={<BsBookmark size={17} />} activeTab={activeTab} onClick={navigate} />
        {!isCreator && (
          <NavItem id={TAB.AFFILIATES} label="Affiliates" icon={<Link2 size={17} />} activeTab={activeTab} onClick={navigate} />
        )}
        <NavItem id={TAB.WITHDRAWALS} label="Withdrawals" icon={<BiMoneyWithdraw size={17} />} activeTab={activeTab} onClick={navigate} />
        <NavItem id={TAB.NOTIFICATIONS} label="Notifications" icon={<BsBell size={17} />} activeTab={activeTab} onClick={navigate} />

        {/* Creator section */}
        {isCreator && (
          <>
            <NavSection label="Creator" />
            <NavItem id={TAB.EVENTS} label="Events" icon={<BsCalendar2Event size={17} />} activeTab={activeTab} onClick={navigate} />
            <NavItem id={TAB.TICKETS_SOLD} label="Tickets Sold" icon={<BsTicketPerforated size={17} />} activeTab={activeTab} onClick={navigate} />
            <NavItem id={TAB.EARNINGS} label="Earnings" icon={<GiTakeMyMoney size={17} />} activeTab={activeTab} onClick={navigate} />
            <NavItem id={TAB.LOCATIONS} label="Locations" icon={<MdOutlineLocationCity size={17} />} activeTab={activeTab} onClick={navigate} />
            <NavItem id={TAB.BOOKINGS} label="Bookings" icon={<RiCalendarCheckLine size={17} />} activeTab={activeTab} onClick={navigate} />
          </>
        )}

        {/* Account */}
        <NavSection label="Account" />
        <NavItem id={TAB.PROFILE} label="Profile" icon={<BsPerson size={17} />} activeTab={activeTab} onClick={navigate} />
        <NavItem id={TAB.SETTINGS} label="Settings" icon={<BsGear size={17} />} activeTab={activeTab} onClick={navigate} />
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <BiLogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );

  const tabTitle: Record<TabId, string> = {
    [TAB.EVENTS]: "Events",
    [TAB.EARNINGS]: "Earnings",
    [TAB.NOTIFICATIONS]: "Notifications",
    [TAB.SETTINGS]: "Settings",
    [TAB.PROFILE]: "Profile",
    [TAB.WITHDRAWALS]: "Withdrawals",
    [TAB.LOCATIONS]: "Locations",
    [TAB.BOOKINGS]: "Bookings",
    [TAB.MY_TICKETS]: "My Tickets",
    [TAB.TICKETS_SOLD]: "Tickets Sold",
    [TAB.AFFILIATES]: "Affiliates",
    [TAB.SAVED_EVENTS]: "Saved Events",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <EventTypeModal
        isOpen={showEventTypeModal}
        onClose={() => setShowEventTypeModal(false)}
        onSelectType={() => {
          setShowEventTypeModal(false);
          setIsAddEventLoading(true);
          router.push("/create-event");
        }}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebar}

      {/* Right side */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <BiMenuAltLeft size={22} />
            </button>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              {tabTitle[activeTab]}
            </h1>
          </div>
          <ToggleMode />
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-10 w-10 rounded-full border-4 border-[#f54502]/20 border-t-[#f54502] animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === TAB.EVENTS && isCreator && <EventList />}
                {activeTab === TAB.EARNINGS && isCreator && <Earnings />}
                {activeTab === TAB.WITHDRAWALS && <Withdrawals />}
                {activeTab === TAB.LOCATIONS && isCreator && <LocationManager />}
                {activeTab === TAB.BOOKINGS && isCreator && <LocationBookings />}
                {activeTab === TAB.TICKETS_SOLD && isCreator && <CustomerTickets />}
                {activeTab === TAB.MY_TICKETS && <CustomerTickets />}
                {activeTab === TAB.NOTIFICATIONS && <Notifications />}
                {activeTab === TAB.SETTINGS && <Setting />}
                {activeTab === TAB.PROFILE && <Profile />}
                {activeTab === TAB.AFFILIATES && !isCreator && <AffiliateSection />}
                {activeTab === TAB.SAVED_EVENTS && <SavedEvents />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Floating Create Event button — creators only */}
      {isCreator && !isLoading && (
        <button
          onClick={() => setShowEventTypeModal(true)}
          disabled={isAddEventLoading}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAddEventLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          Create Event
        </button>
      )}

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        itemName="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        confirmButtonClass="bg-red-500 hover:bg-red-600"
      />
    </div>
  );
};

export default Dashboard;
