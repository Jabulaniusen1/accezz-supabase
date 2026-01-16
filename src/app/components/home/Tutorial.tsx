'use client';
import React, { useRef } from 'react';
import { FaUserPlus, FaPlusCircle, FaChartLine, FaQrcode, FaCheckCircle } from 'react-icons/fa';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const Tutorial = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const steps = [
    {
      number: '01',
      icon: <FaUserPlus className="w-8 h-8" />,
      title: "Create Your Account",
      description: "Sign up in seconds and get instant access to our platform",
      color: "from-[#f54502] to-[#d63a02]",
      iconBg: "bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502]"
    },
    {
      number: '02',
      icon: <FaPlusCircle className="w-8 h-8" />,
      title: "Create Your Event",
      description: "Design your event page, set ticket prices, and customize everything",
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    },
    {
      number: '03',
      icon: <FaChartLine className="w-8 h-8" />,
      title: "Track & Monitor",
      description: "Watch your sales in real-time with detailed analytics and insights",
      color: "from-green-500 to-green-600",
      iconBg: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    },
    {
      number: '04',
      icon: <FaQrcode className="w-8 h-8" />,
      title: "Validate Tickets",
      description: "Smooth check-in process with QR code scanning at your venue",
      color: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    }
  ];

  const features = [
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "Easy Setup",
      text: "Get started in minutes with our intuitive interface"
    },
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "Multiple Ticket Types",
      text: "Create VIP, early bird, and general admission tickets"
    },
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "Secure Payments",
      text: "Accept payments safely with our integrated payment system"
    },
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "Analytics Dashboard",
      text: "Track sales, revenue, and attendee data in one place"
    },
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "QR Code Validation",
      text: "Fast and secure entry verification at your events"
    },
    {
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "Mobile Friendly",
      text: "Manage everything on the go with our mobile-optimized platform"
    }
  ];

  return (
    <section 
      ref={containerRef}
      className="relative py-20 md:py-32 bg-white dark:bg-gray-900 overflow-hidden" 
      id='tutorial'
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(245,69,2,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Get Started in{' '}
            <span className="bg-gradient-to-r from-[#f54502] to-[#d63a02] bg-clip-text text-transparent">
              4 Simple Steps
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Launch your first event in minutes. Our platform makes event management simple, 
            powerful, and accessible to everyone.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative group"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Connection line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-[#f54502]/30 to-transparent z-0" 
                     style={{ transform: 'translateY(-50%)' }} />
              )}

              <div className="relative h-full bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8  border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                {/* Step number badge */}
                <div className={`absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center `}>
                  <span className="text-white font-bold text-sm">{step.number}</span>
            </div>

                {/* Icon */}
                <div className={`w-16 h-16 ${step.iconBg} rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Hover effect gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
              </div>
              </motion.div>
            ))}
        </div>

        {/* Features Section */}
          <motion.div
          className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 md:p-12 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Succeed
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make event management effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {features.map((feature, index) => (
                <motion.div
                  key={index}
                className="flex items-start gap-4 p-4 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 rounded-lg flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.text}
                  </p>
                </div>
                </motion.div>
              ))}
            </div>

          {/* CTA Button */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link
              href="/create-event"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white font-semibold rounded-xl  hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <FaPlusCircle className="w-5 h-5" />
              Create Your First Event
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Tutorial;
