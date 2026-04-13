'use client';
import React, { useRef } from 'react';
import {
  FaUserPlus,
  FaPlusCircle,
  FaChartLine,
  FaQrcode,
  FaTicketAlt,
  FaLock,
  FaMobileAlt,
  FaLayerGroup,
} from 'react-icons/fa';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    Icon: FaUserPlus,
    title: 'Create Your Account',
    description:
      'Sign up in seconds — no credit card needed. Get instant access to your event dashboard.',
  },
  {
    number: '02',
    Icon: FaPlusCircle,
    title: 'Build Your Event',
    description:
      'Set up your event page, configure ticket tiers, pricing, and capacity all in one place.',
  },
  {
    number: '03',
    Icon: FaChartLine,
    title: 'Sell & Track',
    description:
      'Share your link and watch sales roll in. Monitor revenue and attendees in real-time.',
  },
  {
    number: '04',
    Icon: FaQrcode,
    title: 'Validate at the Door',
    description:
      'Scan QR codes for instant, secure entry. Fast check-in means no queues at your venue.',
  },
];

const features = [
  {
    Icon: FaTicketAlt,
    title: 'Multiple Ticket Types',
    text: 'VIP, early bird, general — full control over your ticket tiers.',
  },
  {
    Icon: FaLock,
    title: 'Secure Payments',
    text: 'Paystack-powered payments. Fast, reliable, and fully encrypted.',
  },
  {
    Icon: FaChartLine,
    title: 'Live Analytics',
    text: 'Real-time dashboards for sales, revenue, and attendee data.',
  },
  {
    Icon: FaQrcode,
    title: 'QR Validation',
    text: 'Instant, contactless ticket scanning at your event entrance.',
  },
  {
    Icon: FaMobileAlt,
    title: 'Mobile Optimised',
    text: 'Run your entire event from your phone — buy, scan, and manage.',
  },
  {
    Icon: FaLayerGroup,
    title: 'Free to Start',
    text: 'No setup fees. Create your first event today, completely free.',
  },
];

const Tutorial = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-80px' });

  return (
    <section
      ref={containerRef}
      className="relative py-20 md:py-32 bg-gray-950 overflow-hidden"
      id="tutorial"
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,69,2,0.18),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(245,69,2,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-widest uppercase rounded-full border border-[#f54502]/40 text-[#f54502] bg-[#f54502]/10">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Get Started in{' '}
            <span className="bg-gradient-to-r from-[#f54502] to-[#ff8c69] bg-clip-text text-transparent">
              4 Simple Steps
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            From account creation to door-scanning — launch your first event in
            minutes.
          </p>
        </motion.div>

        {/* ── Timeline Steps ── */}
        <div className="relative mb-24">

          {/* Horizontal connector line (desktop only) */}
          <div className="hidden lg:block absolute top-[52px] left-0 right-0 mx-auto w-[75%] h-px bg-gradient-to-r from-transparent via-[#f54502]/50 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: index * 0.12 }}
              >
                {/* Circle + number */}
                <div className="relative mb-6">
                  {/* Outer ring */}
                  <div className="w-[104px] h-[104px] rounded-full border-2 border-[#f54502]/30 flex items-center justify-center bg-gray-900">
                    {/* Inner filled circle */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f54502] to-[#d63a02] flex items-center justify-center shadow-lg shadow-[#f54502]/30">
                      <step.Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  {/* Step number badge */}
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-gray-800 border border-[#f54502]/60 rounded-full flex items-center justify-center text-[11px] font-bold text-[#f54502]">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-[220px]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Feature Cards ── */}
        <motion.div
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 md:p-12"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Everything You Need to Succeed
            </h3>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Powerful tools that make event management genuinely effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-[#f54502]/10 hover:border-[#f54502]/30 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#f54502]/15 text-[#f54502] flex items-center justify-center group-hover:bg-[#f54502] group-hover:text-white transition-all duration-300">
                  <feature.Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1 text-sm">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {feature.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <Link
              href="/create-event"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white font-semibold rounded-xl shadow-lg shadow-[#f54502]/30 hover:shadow-[#f54502]/50 hover:from-[#d63a02] hover:to-[#b52e00] transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <FaPlusCircle className="w-5 h-5" />
              Create Your First Event — It&apos;s Free
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Tutorial;
