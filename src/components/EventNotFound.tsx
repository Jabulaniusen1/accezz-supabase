'use client';

import Link from 'next/link';

export default function EventNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center px-4 animate-fadeIn">
      <div className="max-w-md">
        <div className="mx-auto mb-6">
          <svg
            className="w-24 h-24 text-[#f54502] dark:text-[#f54502] mx-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
          Oops! Event Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The event link you followed is either incorrect or the event has already ended.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#f54502] hover:bg-[#f54502]/90 text-white font-medium py-2 px-4 rounded-md transition duration-200"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
