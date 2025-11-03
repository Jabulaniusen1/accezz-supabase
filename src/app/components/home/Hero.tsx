'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import { MdSpaceDashboard } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import Loader from '@/components/ui/loader/Loader';
import Toast from "@/components/ui/Toast";
import ToggleMode from '@/components/ui/mode/toggleMode';
import { FaArrowRight } from 'react-icons/fa';

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
    <section className="relative min-h-[80vh] md:min-h-screen bg-gray-900 overflow-hidden ">
      {isLoading && <Loader />}
      {loading && <Loader />}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="absolute inset-0 bg-black z-0">
        <div 
          className="absolute inset-0 bg-[url('/accezz-hc.jpg')] bg-cover bg-center opacity-40"
          style={{ backgroundPosition: 'center 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      <header className=" relative w-full z-50 top-0 bg-black/20 backdrop-blur-md">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between h-16">
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
                <button className="text-white hover:text-white/80 transition-colors">
                  <ToggleMode />
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

        <AnimatePresence>
          {isMenuOpen && (
            <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] md:hidden"
                  onClick={() => setIsMenuOpen(false)}
                />
              
              <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 z-[101] md:hidden shadow-2xl border-b-2 border-[#f54502]"
              >
                <div className="flex items-center justify-between px-6 py-5 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#f54502] to-[#d63a02]">
                  <Link
                    href="/"
                    className="flex items-center space-x-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Image 
                      src="/accezz logo.png" 
                      alt="Accezz Logo" 
                      width={140}
                      height={100}
                      className="h-10 w-auto"
                    />
                  </Link>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    style={{ borderRadius: '5px' }}
                  >
                    <FiX className="w-6 h-6 font-bold" />
                  </button>
                </div>

                <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
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
                          className="flex items-center justify-between px-5 py-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-[#f54502] hover:text-white dark:hover:bg-[#f54502] active:bg-[#f54502] active:text-white visited:text-gray-900 dark:visited:text-white transition-all duration-200 group shadow-sm"
                          style={{ borderRadius: '5px' }}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span className="font-semibold">{item.name}</span>
                          <FaArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  <div className="border-t-2 border-gray-200 dark:border-gray-700 my-4"></div>

                  {isLoggedIn ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          handleRedirect("/dashboard");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-3 w-full px-5 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 rounded-xl transition-all shadow-lg"
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
                        className="w-full px-5 py-4 text-lg font-bold text-center text-white bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 rounded-xl transition-all shadow-lg"
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[80vh] md:h-[90vh] flex items-center mt-10">
        <div className="max-w-4xl text-center mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight my-8">
            Find the Vibes. Live the Moment.
          </h1>
          
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg lg:text-xl leading-relaxed">
            Discover concerts, parties, and experiences that create memories you&apos;ll talk about forever — your next big moment is just a click away.
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