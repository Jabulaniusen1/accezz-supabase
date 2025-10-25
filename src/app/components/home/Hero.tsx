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
    { name: "Home", href: "/" },
    { name: "Events", href: "/#events" },
    // { name: "Trending", href: "/#trending" },
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
    <section className="relative min-h-[90vh] bg-gray-900 overflow-hidden">
      {isLoading && <Loader />}
      {loading && <Loader />}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Dark overlay with background image */}
      <div className="absolute inset-0 bg-black z-0">
        <div 
          className="absolute inset-0 bg-[url('https://cdn.pixabay.com/photo/2015/01/21/13/28/silhouette-606701_1280.jpg')] bg-cover bg-center opacity-30"
          style={{ backgroundPosition: 'center 30%' }}
        />
      </div>

      <header className="w-full z-50 top-0 bg-white/10 backdrop-blur-md border-b border-white/20 rounded-b-xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-48">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <FaTicketAlt className="w-6 h-6 text-[#f54502] group-hover:text-[#f54502]/80 transition-colors" />
              <span className="text-xl font-bold dark:text-white text-[#f54502] group-hover:text-[#f54502] transition-colors">
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
                    className="text-sm font-medium dark:text-white/90 text-gray-400 hover:text-white transition-colors duration-200 relative"
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
            Create <span className="text-[#f54502]">unforgettable</span> memories
          </h1>
          
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg lg:text-xl leading-relaxed">
            Find events and make memories that last a lifetime. Your next great experience is just a click away.
          </p>

          <div className="flex flex-col lg:flex-row lg:items-center justify-center gap-4 mb-12">
            <button
              onClick={handleGetStarted}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-[#f54502] hover:bg-[#f54502]/90 text-white text-base font-medium rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Start Creating Magic
            </button>
            
            <a
              href="#events"
              className="flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white text-base font-medium rounded-xl transition-all border border-white/20 hover:border-white/30 backdrop-blur-sm"
            >
              Explore
            </a>
          </div>

          {/* Social proof */}
          <div className="text-gray-300">
            {/* <p className="text-base mb-4 opacity-90">Trusted by creators around the world</p> */}
            <div className="flex items-center justify-center gap-1">
              {/* User avatars */}
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-gray-600 relative">
                  <Image 
                    src="/images/Airsplash.jpeg" 
                    alt="User avatar" 
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-gray-600 relative">
                  <Image 
                    src="/images/daddy-yard.jpeg" 
                    alt="User avatar" 
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="w-10 h-10 z-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white/20 flex items-center justify-center text-white font-semibold text-xs">
                  +2
                </div>
              </div>
              <div className="ml-3 text-sm opacity-80">
                <span className="text-[#f54502] font-medium">100+</span> event organizers
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;