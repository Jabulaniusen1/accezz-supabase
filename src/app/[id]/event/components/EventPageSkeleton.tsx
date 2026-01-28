'use client';
import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const EventPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto lg:px-32 px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-2">
            <Skeleton height="16px" width="60px" />
            <Skeleton height="16px" width="16px" className="rounded-full" />
            <Skeleton height="16px" width="80px" />
            <Skeleton height="16px" width="16px" className="rounded-full" />
            <Skeleton height="16px" width="200px" />
          </div>
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <div className="bg-white dark:bg-gray-800 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-32">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Image Section Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <Skeleton height="500px" className="rounded-2xl" />
              <Skeleton height="56px" className="rounded-xl hidden lg:block" />
            </div>

            {/* Content Section Skeleton */}
            <div className="lg:col-span-3 space-y-6">
              {/* Title */}
              <div className="space-y-3">
                <Skeleton height="48px" width="80%" />
                <Skeleton height="48px" width="60%" />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Skeleton height="20px" />
                <Skeleton height="20px" />
                <Skeleton height="20px" width="90%" />
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Skeleton height="24px" width="24px" className="rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton height="14px" width="60px" />
                      <Skeleton height="18px" width="120px" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links Skeleton */}
              <div className="flex items-center gap-4">
                <Skeleton height="40px" width="40px" className="rounded-full" />
                <Skeleton height="40px" width="40px" className="rounded-full" />
                <Skeleton height="40px" width="40px" className="rounded-full" />
              </div>

              {/* CTA Button (Mobile) */}
              <Skeleton height="56px" className="rounded-xl lg:hidden" />
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Section Skeleton */}
      <div className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-32">
          <div className="mb-8">
            <Skeleton height="36px" width="300px" className="mb-2" />
            <Skeleton height="20px" width="200px" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="space-y-4">
                  <Skeleton height="24px" width="70%" />
                  <Skeleton height="32px" width="50%" />
                  <div className="space-y-2">
                    <Skeleton height="16px" />
                    <Skeleton height="16px" width="80%" />
                  </div>
                  <Skeleton height="48px" className="rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

