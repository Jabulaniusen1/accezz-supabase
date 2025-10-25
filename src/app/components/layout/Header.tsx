"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import { MdSpaceDashboard } from "react-icons/md";
import ToggleMode from "../../../components/ui/mode/toggleMode";
import Loader from "@/components/ui/loader/Loader";
import { useRouter, usePathname } from "next/navigation";
import Toast from "@/components/ui/Toast";

const Header = () => {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: "Discover events", href: "/#events" },
    { name: "How Accezz Works", href: "/#tutorial" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Pricing", href: "/pricing" },
  ];

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
    };
  
    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);
  
    return () => {
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setTimeout(() => {
        setLoading(true);
        localStorage.setItem("lastVisitedPath", pathname);
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToast({ type: "success", message: "Logged out successfully" });
        setIsLoggedIn(false);
        router.push("/auth/login");
      }, 1500);
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
      {loading && <Loader />}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <header className=" w-full z-50">
        <div className=" mx-auto lg:py-5 py-2 sm:px-6 lg:px-32">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <Image 
                src="/accezz logo c.png" 
                alt="Accezz Logo" 
                width={180}
                height={130}
                className="h-10 sm:h-12 lg:h-14 w-auto"
              />
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
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#f54502] transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                ))}
              </div>

              <div className="flex items-center space-x-6">
                {/* Search Icon */}
                <button className="text-gray-700 dark:text-gray-300 hover:text-[#f54502] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                
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
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#f54502] transition-colors"
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
              <ToggleMode />
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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-black/50 backdrop-blur-md border-t border-white/20 overflow-hidden rounded-b-xl"
            >
              <div className="px-4 py-2 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-3 text-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}

                <div className="pt-2 border-t border-white/20">
                  {isLoggedIn ? (
                    <>
                      <button
                        onClick={() => {
                          handleRedirect("/dashboard");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-3 text-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg"
                      >
                        <MdSpaceDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-3 text-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg"
                      >
                        <FiLogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleRedirect("/auth/login");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-3 text-base font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg"
                      >
                        <FiUser className="w-5 h-5" />
                        <span>Sign In</span>
                      </button>
                      <button
                        onClick={() => {
                          handleRedirect("/auth/signup");
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-3 py-3 text-base font-medium text-center text-white bg-[#f54502] hover:bg-[#f54502]/90 rounded-lg transition-colors mt-2"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Header;