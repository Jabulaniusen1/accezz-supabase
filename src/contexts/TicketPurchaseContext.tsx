'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TicketPurchaseContextType {
  isPurchasing: boolean;
  setIsPurchasing: (value: boolean) => void;
}

const TicketPurchaseContext = createContext<TicketPurchaseContextType | undefined>(undefined);

export function TicketPurchaseProvider({ children }: { children: ReactNode }) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  return (
    <TicketPurchaseContext.Provider value={{ isPurchasing, setIsPurchasing }}>
      {children}
    </TicketPurchaseContext.Provider>
  );
}

export function useTicketPurchase() {
  const context = useContext(TicketPurchaseContext);
  if (context === undefined) {
    throw new Error('useTicketPurchase must be used within a TicketPurchaseProvider');
  }
  return context;
}

