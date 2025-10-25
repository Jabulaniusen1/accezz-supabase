'use client';
import React, { memo } from 'react';

interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(({ 
  height = '20px', 
  width = '100%', 
  className = '' 
}) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} 
      style={{ height, width }} 
    />
  );
});

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
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} height="40px" />
      ))}
    </div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, j) => (
          <Skeleton key={j} height="24px" />
        ))}
      </div>
    ))}
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';