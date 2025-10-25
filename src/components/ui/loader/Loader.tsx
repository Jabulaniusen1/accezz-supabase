'use client';
import React, { useEffect } from 'react';
import { ClipLoader } from 'react-spinners';

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <ClipLoader size={48} color="#2563eb" loading={true} />
          <span className="mt-4 text-base font-medium text-blue-700 dark:text-blue-300 animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    </div>
  );
};

export default Loader;