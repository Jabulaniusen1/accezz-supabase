import React from 'react';

export default function CheckoutSkeleton() {
  return (
    <div className="page-container animate-pulse pb-16 pt-6">
      <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-5 h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-6 h-8 w-full max-w-xl rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="h-[420px] rounded-card bg-gray-200 dark:bg-gray-800" />
        <div className="hidden h-[360px] rounded-card bg-gray-200 dark:bg-gray-800 lg:block" />
      </div>
    </div>
  );
}
