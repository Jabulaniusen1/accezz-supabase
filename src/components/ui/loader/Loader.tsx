'use client';
import React, { useEffect } from 'react';
import Image from 'next/image';

const Loader = () => {
  // Prevent background scroll when loader is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white">
      {/* Main Loading Content */}
      <div className="flex flex-col items-center space-y-6">
        {/* Logo with Simple Animation */}
        <div className="relative">
          {/* Simple Rotating Ring */}
          <div className="w-20 h-20 border-4 border-[#f54502]/20 rounded-full animate-spin"></div>
          
          {/* Logo Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/accezz logo.png"
              alt="Accezz Logo"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            Accezz
          </h2>
          <p className="text-gray-500 text-sm">
            Loading...
          </p>
        </div>

        {/* Simple Loading Dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-[#f54502] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[#f54502] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-[#f54502] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Loader;