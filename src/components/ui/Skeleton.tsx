'use client';
import React, { memo } from 'react';

interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(({ height = '20px', width = '100%', className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    style={{ height, width }}
  />
));
Skeleton.displayName = 'Skeleton';

export const CardSkeleton = memo(() => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
    <Skeleton height="200px" className="mb-4" />
    <Skeleton height="24px" width="60%" className="mb-2" />
    <Skeleton height="16px" width="40%" className="mb-4" />
    <div className="space-y-2">
      <Skeleton height="16px" />
      <Skeleton height="16px" />
      <Skeleton height="16px" width="80%" />
    </div>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

export const TableSkeleton = memo(() => (
  <div className="space-y-4">
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} height="40px" />)}
    </div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, j) => <Skeleton key={j} height="24px" />)}
      </div>
    ))}
  </div>
));
TableSkeleton.displayName = 'TableSkeleton';

/** Full-page skeleton — use when a whole page is waiting for data */
export const PageSkeleton = memo(() => (
  <div className="min-h-screen p-6 space-y-6 animate-pulse">
    <Skeleton height="48px" width="40%" />
    <Skeleton height="24px" width="60%" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
          <Skeleton height="180px" className="rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton height="20px" width="70%" />
            <Skeleton height="16px" width="50%" />
            <Skeleton height="14px" />
          </div>
        </div>
      ))}
    </div>
  </div>
));
PageSkeleton.displayName = 'PageSkeleton';

/** Carousel skeleton — used by the featured/latest event carousel */
export const CarouselSkeleton = memo(() => (
  <div className="py-12 px-4 sm:px-6 lg:px-8 animate-pulse">
    <div className="max-w-7xl mx-auto">
      <Skeleton height="32px" width="200px" className="mb-4" />
      <Skeleton height="48px" width="320px" className="mb-10" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4 p-8 rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Skeleton height="20px" width="80px" />
          <Skeleton height="36px" />
          <Skeleton height="20px" width="60%" />
          <Skeleton height="20px" width="50%" />
          <Skeleton height="44px" width="160px" className="rounded-lg" />
        </div>
        <Skeleton height="400px" className="rounded-2xl" />
      </div>
    </div>
  </div>
));
CarouselSkeleton.displayName = 'CarouselSkeleton';
