"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
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
    { name: "Home", href: "/" },
    { name: "Events", href: "/#events" },
    { name: "Trending", href: "/#trending" },
    { name: "Pricing", href: "/pricing" },
    { name: "How It Works", href: "/#tutorial" },
    // { name: "QR Scanner", href: "/qr-code-scanner" },
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
        <div className=" mx-auto lg:py-5 py-2 sm:px-6 lg:px-48">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <FaTicketAlt className="w-6 h-6 text-[#f54502] group-hover:text-[#f54502]/80 transition-colors" />
              <span className="text-xl font-bold text-gray-700 dark:text-gray-300 group-hover:text-[#f54502] transition-colors">
                Accezz
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200 relative"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#f54502] transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                ))}
              </div>

              <div className="flex items-center space-x-4 pl-4 border-l border-white/20">
                <ToggleMode />
                
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => handleRedirect("/dashboard")}
                      className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/10 transition-colors"
                      title="Dashboard"
                    >
                      <MdSpaceDashboard className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white/10 transition-colors"
                      title="Logout"
                    >
                      <FiLogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRedirect("/auth/login")}
                      className="px-6 py-2 text-sm font-medium text-[#f54502] hover:bg-[#f54502]/10 rounded-xl hover:scale-105 transition-all transform"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => handleRedirect("/auth/signup")}
                      className="px-6 py-2 flex items-center justify-center gap-3 bg-[#f54502] hover:bg-[#f54502]/90 text-white text-sm font-medium rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Sign Up
                    </button>
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