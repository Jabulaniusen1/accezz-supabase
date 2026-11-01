'use client';

import React, { Suspense } from 'react';
import Header from '@/app/components/layout/Header';
import CheckoutFlow from './components/CheckoutFlow';
import CheckoutSkeleton from './components/CheckoutSkeleton';

/** /{event-slug}/checkout?ticket={ticketTypeId} (or ?orderId= to resume a pending order) */
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          <CheckoutSkeleton />
        </div>
      }
    >
      <CheckoutFlow />
    </Suspense>
  );
}
