"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiLogOut, FiUser } from '@/icon-adapters/react-icons/fi';
import { MdSpaceDashboard } from '@/icon-adapters/react-icons/md';
// import ToggleMode from "../../../components/ui/mode/toggleMode";
import { useRouter, usePathname } from "next/navigation";
import Toast from "@/components/ui/Toast";
import { FaArrowRight } from '@/icon-adapters/react-icons/fa';
import { useIsLoggedIn } from '@/hooks/useIsLoggedIn';
import { signOut } from '@/utils/supabaseAuth';
// import Logo from "@/components/ui/Logo";

const Header = () => {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useIsLoggedIn();
  const [loading, setLoading] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Discover", href: "/events" },
    { name: "Locations", href: "/locations" },
    { name: "How it Works", href: "/#tutorial" },
    { name: "About", href: "/about" },
    // { name: "Blog", href: "/blog" },
    { name: "Pricing", href: "/pricing" },
  ];


  const handleLogout = async () => {
    try {
      setLoading(true);
      localStorage.setItem("lastVisitedPath", pathname);
      // End the Supabase session (not just local flags), so shared devices are safe
      await signOut();
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setToast({ type: "success", message: "Logged out successfully" });
      setIsLoggedIn(false);
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out", error);
      setToast({ type: "error", message: "Error logging out" });
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = (path: string) => {
    try {
      setLoading(true);
      localStorage.setItem("lastVisitedPath", pathname);
      router.push(path);
    } catch (error) {
      console.error("Navigation error", error);
      setToast({ type: "error", message: "Navigation error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <header className=" w-full z-50">
        <div className="page-container py-2 lg:py-5">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <Image src="/accezz logo c.png" alt="Accezz Logo" width={140} height={100} />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200 relative"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                ))}
              </div>

              <div className="flex items-center space-x-6">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => handleRedirect("/dashboard")}
                      className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Dashboard"
                    >
                      <MdSpaceDashboard className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Logout"
                    >
                      <FiLogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="px-10 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      style={{
                        borderRadius: '10px'
                      }}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden space-x-4">
              {/* <ToggleMode /> */}
              <button
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <FiX className="w-6 h-6" />
                ) : (
                  <FiMenu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] md:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Menu Panel - Slide from top */}
              <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 z-[101] md:hidden shadow-2xl border-b-2 border-brand"
              >
                {/* Menu Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand to-brand-dark">
                  <div className="flex items-center space-x-3">
                    {/* <Logo 
                      variant="white"
                      width={140}
                      height={100}
                      className="h-10 w-auto"
                    /> */}
                    <Image src="/accezz logo c.png" alt="Accezz Logo" width={140} height={100} />
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    style={{ borderRadius: '5px' }}
                  >
                    <FiX className="w-6 h-6 font-bold" />
                  </button>
                </div>

                {/* Menu Content */}
                <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
                  {/* Navigation Items */}
                  <div className="space-y-2 mb-4">
                    {navItems.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <Link
                          href={item.href}
                          className="flex items-center justify-between px-5 py-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-brand hover:text-white dark:hover:bg-brand active:bg-brand active:text-white visited:text-gray-900 dark:visited:text-white transition-all duration-200 group shadow-sm"
                          style={{ borderRadius: '5px' }}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span className="font-semibold">{item.name}</span>
                          <FaArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t-2 border-gray-200 dark:border-gray-700 my-4"></div>

                  {/* Auth Section */}
                  {isLoggedIn ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          handleRedirect("/dashboard");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-5 py-4 text-lg font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand/90 hover:to-brand-dark/90 rounded-xl transition-all shadow-lg"
                        style={{ borderRadius: '5px' }}
                      >
                        <MdSpaceDashboard className="w-6 h-6" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-5 py-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
                        style={{ borderRadius: '5px' }}
                      >
                        <FiLogOut className="w-6 h-6" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          handleRedirect("/auth/login");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-5 py-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
                        style={{ borderRadius: '5px' }}
                      >
                        <FiUser className="w-6 h-6" />
                        <span>Sign In</span>
                      </button>
                      <button
                        onClick={() => {
                          handleRedirect("/auth/signup");
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-5 py-4 text-lg font-bold text-center text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand/90 hover:to-brand-dark/90 rounded-xl transition-all shadow-lg"
                        style={{ borderRadius: '5px' }}
                      >
                        Sign Up
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;