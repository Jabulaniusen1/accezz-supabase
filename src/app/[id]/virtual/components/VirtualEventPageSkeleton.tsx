'use client';
import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const VirtualEventPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumb Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto px-4 sm:px-6 lg:px-32 py-4">
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
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            {/* Text Content Skeleton */}
            <div className="w-full lg:flex-1 space-y-6">
              <Skeleton height="24px" width="150px" className="rounded-full" />
              <div className="space-y-3">
                <Skeleton height="48px" width="90%" />
                <Skeleton height="48px" width="70%" />
              </div>
              <div className="space-y-2">
                <Skeleton height="20px" />
                <Skeleton height="20px" />
                <Skeleton height="20px" width="80%" />
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Skeleton height="20px" width="20px" className="rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton height="12px" width="60px" />
                      <Skeleton height="16px" width="100px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Skeleton */}
            <div className="w-full lg:w-auto lg:flex-1">
              <Skeleton height="300px" className="rounded-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Section Skeleton */}
      <div className="bg-white dark:bg-gray-900 py-10">
        <div className="mx-auto px-4 sm:px-6 lg:px-32">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton height="32px" width="200px" />
              <div className="space-y-3">
                <Skeleton height="20px" />
                <Skeleton height="20px" />
                <Skeleton height="20px" width="90%" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
                <Skeleton height="24px" width="150px" />
                <Skeleton height="48px" width="100%" />
                <Skeleton height="48px" width="100%" />
              </div>
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

