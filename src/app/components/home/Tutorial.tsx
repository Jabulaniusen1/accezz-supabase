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
} from '@/icon-adapters/react-icons/fa';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const steps = [
  {
    Icon: FaUserPlus,
    title: 'Create your account',
    description: 'Sign up in seconds, no credit card needed, and get straight into your event dashboard.',
  },
  {
    Icon: FaPlusCircle,
    title: 'Build your event',
    description: 'Set up your event page, ticket types, prices and capacity, all in one place.',
  },
  {
    Icon: FaChartLine,
    title: 'Sell and track',
    description: 'Share your link and watch sales come in. Follow revenue and attendees in real time.',
  },
  {
    Icon: FaQrcode,
    title: 'Check guests in',
    description: 'Scan QR codes at the door for fast, secure entry and no queues at your venue.',
  },
];

const features = [
  {
    Icon: FaTicketAlt,
    title: 'Multiple ticket types',
    text: 'VIP, early bird, general: full control over your ticket tiers.',
  },
  {
    Icon: FaLock,
    title: 'Secure payments',
    text: 'Payments by Paystack. Fast, reliable and fully encrypted.',
  },
  {
    Icon: FaChartLine,
    title: 'Live analytics',
    text: 'Real-time dashboards for sales, revenue and attendees.',
  },
  {
    Icon: FaQrcode,
    title: 'QR check-in',
    text: 'Instant, contactless ticket scanning at your entrance.',
  },
  {
    Icon: FaMobileAlt,
    title: 'Works on your phone',
    text: 'Create, sell and scan, all from your phone.',
  },
  {
    Icon: FaLayerGroup,
    title: 'Free to start',
    text: 'No setup fees. Create your first event today for free.',
  },
];

const fadeUp = (isInView: boolean, delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: isInView ? { opacity: 1, y: 0 } : {},
  transition: { duration: 0.45, delay },
});

const Tutorial = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-80px' });

  return (
    <section
      ref={containerRef}
      id="tutorial"
      className="border-t border-gray-100 bg-white py-16 dark:border-gray-800 dark:bg-gray-900 sm:py-20"
    >
      <div className="page-container">
        {/* Header */}
        <motion.div
          {...fadeUp(isInView)}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">How it works</p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl lg:text-4xl">
              Get started in 4 simple steps
            </h2>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
              From sign-up to scanning tickets at the door, launch your first event in minutes.
            </p>
          </div>
          <Link
            href="/create-event"
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark lg:self-auto"
          >
            <FaPlusCircle className="h-4 w-4" />
            Create your first event
          </Link>
        </motion.div>

        {/* Steps */}
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.li
              key={step.title}
              {...fadeUp(isInView, 0.08 * (index + 1))}
              className="rounded-card border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e7] text-brand dark:bg-brand/15">
                  <step.Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-gray-300 dark:text-gray-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-gray-900 dark:text-white sm:text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{step.description}</p>
            </motion.li>
          ))}
        </ol>

        {/* Features */}
        <motion.div
          {...fadeUp(isInView, 0.4)}
          className="mt-12 rounded-card border border-[#ffd9c9] bg-[#fff4ee] p-6 dark:border-brand/30 dark:bg-brand/10 sm:p-10"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Everything you need to run your event
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Simple tools that take care of tickets, payments and entry.
          </p>

          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-brand shadow-sm dark:bg-gray-900">
                  <feature.Icon className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white sm:text-base">{feature.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Tutorial;
