'use client';
import React, { useEffect, useRef } from 'react';
import { FaUserPlus, FaPlusCircle, FaChartLine, FaQrcode } from 'react-icons/fa';
import { motion, useInView } from 'framer-motion';

const Tutorial = () => {
  const videoRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView && videoRef.current) {
      const currentSrc = videoRef.current.src;
      videoRef.current.src = currentSrc + "&autoplay=1&mute=1";
    }
  }, [isInView]);

  // Removed unused togglePlay function

  return (
    <section className="relative py-24 bg-gradient-to-br from-[#f54502]/5 to-[#f54502]/10 dark:from-gray-900 dark:to-gray-800 overflow-hidden" id='tutorial'>
      {/* Abstract background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-[#f54502]/10 to-transparent dark:from-[#f54502]/5"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#f54502]/10 to-transparent dark:from-[#f54502]/5"></div>
        
        {/* Floating decorative elements */}
        <motion.div 
          animate={{
            rotate: [0, 360],
            x: [0, 20, 0],
            y: [0, -15, 0]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border-2 border-blue-200/50 dark:border-blue-900/30"
        />
        
        <motion.div 
          animate={{
            rotate: [0, -360],
            y: [0, 20, 0]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-lg bg-[#f54502]/20 dark:bg-[#f54502]/10"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Diagonal header section */}
        <motion.div 
          className="mb-16 text-center -rotate-1 transform origin-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-4 py-2 bg-[#f54502]/10 dark:bg-[#f54502]/20 rounded-full mb-6 rotate-1">
            <span className="text-sm font-medium text-[#f54502] dark:text-[#f54502] uppercase tracking-wider">
              Quick Start Guide
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="relative inline-block">
              <span className="relative z-10">Master Accezz</span>
              <span className="absolute bottom-2 left-0 w-full h-3 bg-[#f54502]/30 dark:bg-[#f54502]/20 -z-0 rotate-2"></span>
            </span>
          </h2>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Learn how to create, manage, and sell out your events with our powerful platform
          </p>
        </motion.div>

        {/* Video section with floating effect */}
        <div ref={containerRef} className="relative">
          {/* <motion.div
            className="relative rounded-3xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            whileHover={{ y: -5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10 pointer-events-none" />
            
            <motion.button
              onClick={togglePlay}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-md 
                       hover:bg-white/30 text-white rounded-full p-5 shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? (
                <FaPause className="w-6 h-6" />
              ) : (
                <FaPlay className="w-6 h-6 ml-1" />
              )}
            </motion.button>

            <div className="relative pb-[56.25%] h-0">
              <iframe
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/HK5GJfm4G10?si=odukjni1Fp4EaQ9k&enablejsapi=1"
                title="How to use V-Ticket"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div> */}

          {/* Steps in floating cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {[
              {
                icon: <FaUserPlus className="w-6 h-6" />,
                title: "Sign Up",
                description: "Create your organizer account in seconds",
                color: "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
              },
              {
                icon: <FaPlusCircle className="w-6 h-6" />,
                title: "Create Event",
                description: "Set up your event details and tickets",
                color: "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
              },
              {
                icon: <FaChartLine className="w-6 h-6" />,
                title: "Track Sales",
                description: "Monitor real-time analytics",
                color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              },
              {
                icon: <FaQrcode className="w-6 h-6" />,
                title: "Validate Tickets",
                description: "Scan QR codes at entry",
                color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-800"
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`w-12 h-12 ${step.color} rounded-full flex items-center justify-center mb-4`}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Key features in staggered layout */}
          <motion.div
            className="mt-16 space-y-8"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              Powerful Event Management Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "Instant Event Creation",
                  description: "Launch your event in minutes with our intuitive setup process. Customize every detail from tickets to event page design."
                },
                {
                  title: "Smart Ticket Types",
                  description: "Create multiple ticket tiers with different pricing, quantities, and perks to maximize your sales."
                },
                {
                  title: "Real-Time Analytics",
                  description: "Track ticket sales, revenue, and attendee demographics in real-time through your dashboard."
                },
                {
                  title: "Secure Check-In",
                  description: "Our QR code validation system ensures smooth and secure event entry for all attendees."
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 rounded-xl border border-gray-200 dark:border-gray-800 ${
                    index % 2 === 0 ? 'md:transform md:-rotate-1' : 'md:transform md:rotate-1'
                  }`}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                >
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Tutorial;