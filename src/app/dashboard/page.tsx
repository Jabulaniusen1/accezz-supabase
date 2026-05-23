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
import InlineCreateEvent from "./components/InlineCreateEvent";
import InlineEditEvent from "./components/InlineEditEvent";
import InlineAnalytics from "./components/InlineAnalytics";
import { useRouter, usePathname } from "next/navigation";
import { getSession, signOut } from "@/utils/supabaseAuth";
import { supabase } from "@/utils/supabaseClient";
import ConfirmationModal from "@/components/ConfirmationModal";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  Ticket01Icon,
  Notification01Icon,
  Bookmark01Icon,
  AffiliateIcon,
  Money01Icon,
  Location01Icon,
  CalendarCheckIn01Icon,
  User02Icon,
  Settings01Icon,
  Logout01Icon,
  HelpCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { BiMenuAltLeft, BiX } from '@/icon-adapters/react-icons/bi';

type IconSvgElement = readonly (readonly [string, { readonly [key: string]: string | number }])[];

// ── Tab IDs ───────────────────────────────────────────────────────────────────
const TAB = {
  MY_TICKETS: 0,
  SAVED_EVENTS: 1,
  AFFILIATES: 2,
  WITHDRAWALS: 3,
  NOTIFICATIONS: 4,
  EVENTS: 5,
  TICKETS_SOLD: 6,
  EARNINGS: 7,
  LOCATIONS: 8,
  BOOKINGS: 9,
  PROFILE: 10,
  SETTINGS: 11,
  CREATE_EVENT: 12,
  EDIT_EVENT: 13,
  ANALYTICS: 14,
} as const;

type TabId = (typeof TAB)[keyof typeof TAB];

// ── Nav item ──────────────────────────────────────────────────────────────────
interface NavItemProps {
  id: TabId;
  label: string;
  icon: IconSvgElement;
  activeTab: TabId;
  onClick: (id: TabId) => void;
}

function NavItem({ id, label, icon, activeTab, onClick }: NavItemProps) {
  const isActive =
    activeTab === id ||
    (id === TAB.EVENTS && (activeTab === TAB.CREATE_EVENT || activeTab === TAB.EDIT_EVENT || activeTab === TAB.ANALYTICS));
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all duration-150 ${
        isActive
          ? "bg-[#f54502]/10 text-[#f54502]"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
      }`}
    >
      <HugeiconsIcon
        icon={icon}
        size={22}
        className="flex-shrink-0"
        strokeWidth={isActive ? 2 : 1.5}
      />
      {label}
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function NavSection({ label }: { label: string }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
      {label}
    </p>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabId>(TAB.MY_TICKETS);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [analyticsEventId, setAnalyticsEventId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
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

        const type =
          (profile?.user_type as "creator" | "customer") || "customer";
        setUserType(type);
        setUserName(
          profile?.full_name ||
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "User"
        );
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
    setSidebarOpen(false);
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
      className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-[68px] px-5 border-b border-gray-100 dark:border-gray-800">
        <Link href="/">
          <Logo
            variant="default"
            width={90}
            height={90}
            className="w-24 h-10 object-contain"
            priority
          />
        </Link>
        <button
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setSidebarOpen(false)}
        >
          <BiX size={22} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {/* My Account */}
        <NavSection label="My Account" />
        <NavItem
          id={TAB.MY_TICKETS}
          label="My Tickets"
          icon={Ticket01Icon}
          activeTab={activeTab}
          onClick={navigate}
        />
        <NavItem
          id={TAB.SAVED_EVENTS}
          label="Saved Events"
          icon={Bookmark01Icon}
          activeTab={activeTab}
          onClick={navigate}
        />
        {!isCreator && (
          <NavItem
            id={TAB.AFFILIATES}
            label="Affiliates"
            icon={AffiliateIcon}
            activeTab={activeTab}
            onClick={navigate}
          />
        )}
        <NavItem
          id={TAB.WITHDRAWALS}
          label="Withdrawals"
          icon={Wallet01Icon}
          activeTab={activeTab}
          onClick={navigate}
        />
        <NavItem
          id={TAB.NOTIFICATIONS}
          label="Notifications"
          icon={Notification01Icon}
          activeTab={activeTab}
          onClick={navigate}
        />

        {/* Creator */}
        {isCreator && (
          <>
            <NavSection label="Creator" />
            <NavItem
              id={TAB.EVENTS}
              label="Events"
              icon={Calendar01Icon}
              activeTab={activeTab}
              onClick={navigate}
            />
            <NavItem
              id={TAB.TICKETS_SOLD}
              label="Tickets Sold"
              icon={Ticket01Icon}
              activeTab={activeTab}
              onClick={navigate}
            />
            <NavItem
              id={TAB.EARNINGS}
              label="Earnings"
              icon={Money01Icon}
              activeTab={activeTab}
              onClick={navigate}
            />
            <NavItem
              id={TAB.LOCATIONS}
              label="Locations"
              icon={Location01Icon}
              activeTab={activeTab}
              onClick={navigate}
            />
            <NavItem
              id={TAB.BOOKINGS}
              label="Bookings"
              icon={CalendarCheckIn01Icon}
              activeTab={activeTab}
              onClick={navigate}
            />
          </>
        )}

        {/* Account */}
        <NavSection label="Account" />
        <NavItem
          id={TAB.PROFILE}
          label="Profile"
          icon={User02Icon}
          activeTab={activeTab}
          onClick={navigate}
        />
        <NavItem
          id={TAB.SETTINGS}
          label="Settings"
          icon={Settings01Icon}
          activeTab={activeTab}
          onClick={navigate}
        />
      </nav>

      {/* Bottom: Help + Logout */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
        <button className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150">
          <HugeiconsIcon icon={HelpCircleIcon} size={22} strokeWidth={1.5} />
          Help
        </button>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[15px] font-medium text-[#f54502] hover:bg-[#f54502]/10 transition-all duration-150"
        >
          <HugeiconsIcon icon={Logout01Icon} size={22} strokeWidth={1.5} />
          Logout
        </button>
      </div>
    </aside>
  );

  const tabTitle: Partial<Record<TabId, string>> = {
    [TAB.MY_TICKETS]: "My Tickets",
    [TAB.SAVED_EVENTS]: "Saved Events",
    [TAB.AFFILIATES]: "Affiliates",
    [TAB.WITHDRAWALS]: "Withdrawals",
    [TAB.NOTIFICATIONS]: "Notifications",
    [TAB.EVENTS]: "Events",
    [TAB.TICKETS_SOLD]: "Tickets Sold",
    [TAB.EARNINGS]: "Earnings",
    [TAB.LOCATIONS]: "Locations",
    [TAB.BOOKINGS]: "Bookings",
    [TAB.PROFILE]: "Profile",
    [TAB.SETTINGS]: "Settings",
    [TAB.CREATE_EVENT]: "New Event",
    [TAB.EDIT_EVENT]: "Edit Event",
    [TAB.ANALYTICS]: "Analytics",
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-[#f54502]/20 border-t-[#f54502] animate-spin" />
        </div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === TAB.EVENTS && isCreator && (
            <EventList
              onCreateEvent={() => setActiveTab(TAB.CREATE_EVENT)}
              onEditEvent={(id) => { setEditingEventId(id); setActiveTab(TAB.EDIT_EVENT); }}
              onAnalyticsEvent={(id) => { setAnalyticsEventId(id); setActiveTab(TAB.ANALYTICS); }}
            />
          )}
          {activeTab === TAB.CREATE_EVENT && (
            <InlineCreateEvent
              onBack={() => setActiveTab(TAB.EVENTS)}
              userName={userName}
            />
          )}
          {activeTab === TAB.EDIT_EVENT && editingEventId && (
            <InlineEditEvent
              eventId={editingEventId}
              onBack={() => setActiveTab(TAB.EVENTS)}
            />
          )}
          {activeTab === TAB.ANALYTICS && analyticsEventId && (
            <InlineAnalytics
              eventId={analyticsEventId}
              onBack={() => setActiveTab(TAB.EVENTS)}
            />
          )}
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
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebar}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-[64px] px-4 md:px-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2.5">
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <BiMenuAltLeft size={24} />
            </button>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[180px] xs:max-w-none">
              {tabTitle[activeTab]}
            </h1>
          </div>
          {userName && (
            <div className="w-8 h-8 rounded-full bg-[#f54502]/10 border border-[#f54502]/20 flex items-center justify-center flex-shrink-0 cursor-default select-none">
              <span className="text-[#f54502] text-sm font-bold leading-none">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 p-5 md:p-7">{renderContent()}</main>
      </div>

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
