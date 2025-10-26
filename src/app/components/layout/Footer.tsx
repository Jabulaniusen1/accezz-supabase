'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  return (
    <footer className="bg-[#f8f6f0] text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-8 sm:mb-12">
          {/* Left Section - Company Info and Newsletter */}
          <div className="space-y-6">
            {/* Brand */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#f54502] mb-2 sm:mb-3">
                accezz.
              </h3>
              <p className="text-gray-700 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">
                Accezz is an event ticketing platform for memorable experiences in Africa.
              </p>
            </div>
            
            {/* Newsletter */}
            <div>
              <p className="text-gray-700 text-xs sm:text-sm mb-3 sm:mb-4">
                Sign up to our newsletter to receive information about upcoming events.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your Email"
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502]"
                  style={{ borderRadius: '5px' }}
                  required
                />
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 bg-[#f54502] text-white text-xs sm:text-sm font-medium hover:bg-[#f54502]/90 transition-colors"
                  style={{ borderRadius: '5px' }}
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Middle Section - Company Links */}
          <div className="space-y-4">
            <h4 className="text-[#f54502] font-semibold text-lg">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-700 hover:text-[#f54502] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/#tutorial" className="text-gray-700 hover:text-[#f54502] transition-colors">
                  How Accezz Works
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-700 hover:text-[#f54502] transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Section - Social Media */}
          <div className="space-y-4">
            <h4 className="text-[#f54502] font-semibold text-lg">Follow Us</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://facebook.com" className="flex items-center gap-3 text-gray-700 hover:text-[#f54502] transition-colors">
                  <FaFacebook className="w-4 h-4" />
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a href="https://x.com" className="flex items-center gap-3 text-gray-700 hover:text-[#f54502] transition-colors">
                  <FaXTwitter className="w-4 h-4" />
                  <span>X</span>
                </a>
              </li>
              <li>
                <a href="https://instagram.com" className="flex items-center gap-3 text-gray-700 hover:text-[#f54502] transition-colors">
                  <FaInstagram className="w-4 h-4" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a href="https://tiktok.com" className="flex items-center gap-3 text-gray-700 hover:text-[#f54502] transition-colors">
                  <FaTiktok className="w-4 h-4" />
                  <span>TikTok</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section - Copyright and Legal Links */}
        <div className="border-t border-gray-300 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              Copyright © {currentYear}. Accezz Technology Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/term&condition" className="text-gray-600 hover:text-[#f54502] transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-[#f54502] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/refund" className="text-gray-600 hover:text-[#f54502] transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 