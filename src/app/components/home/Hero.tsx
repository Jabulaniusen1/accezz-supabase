'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaTicketAlt } from 'react-icons/fa';
import { FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import { MdSpaceDashboard } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import Loader from '@/components/ui/loader/Loader';
import ToggleMode from "../../../components/ui/mode/toggleMode";
import Toast from "@/components/ui/Toast";

const Hero = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
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

  const handleGetStarted = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.setItem("lastVisitedPath", pathname);
        const latestEvent = document.getElementById('latestEvents');
        latestEvent?.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error handling Get Started:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen bg-gray-900 overflow-hidden ">
      {isLoading && <Loader />}
      {loading && <Loader />}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Simple background with image */}
      <div className="absolute inset-0 bg-black z-0">
        <div 
          className="absolute inset-0 bg-[url('/accezz-hc.jpg')] bg-cover bg-center opacity-40"
          style={{ backgroundPosition: 'center 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      <header className="w-full z-50 top-0 bg-black/20 backdrop-blur-md">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <Image 
                src="/accezz logo.png" 
                alt="Accezz Logo" 
                width={180}
                height={130}
                className="h-14 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm font-medium text-white hover:text-white/80 transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              <div className="flex items-center space-x-6">
                {/* Search Icon */}
                <button className="text-white hover:text-white/80 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => handleRedirect("/dashboard")}
                      className="flex items-center justify-center p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      title="Dashboard"
                    >
                      <MdSpaceDashboard className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      title="Logout"
                    >
                      <FiLogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-sm font-medium text-white hover:text-white/80 transition-colors "
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="px-10 py-3 text-sm font-medium text-white border border-white rounded-lg hover:bg-white/10 transition-colors rounded-xl" 
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden space-x-4">
              <button
                className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[90vh] flex items-center z-10 mt-10">
        <div className="max-w-4xl text-center mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight my-8">
            Find the Vibes. Live the Moment.
          </h1>
          
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg lg:text-xl leading-relaxed">
            Discover concerts, parties, and experiences that create memories you'll talk about forever — your next big moment is just a click away.
          </p>

          <div className="flex flex-col lg:flex-row lg:items-center justify-center gap-4 mb-12">
            <button
              onClick={handleGetStarted}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-[#f54502] hover:bg-[#f54502]/90 text-white text-base font-medium rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
            
            <a
              href="#events"
              className="flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-base font-medium rounded-xl transition-all border border-white/20 hover:border-white/30 backdrop-blur-sm"
            >
              Discover Events
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;