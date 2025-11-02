import { Event } from "../types/event";

export const saveFormProgress = (data: Partial<Event>) => {
  try {
    localStorage.setItem(
      "eventFormProgress",
      JSON.stringify({
        data,
        lastUpdated: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error("Error saving form progress:", error);
  }
};

export const getFormProgress = (): Partial<Event> | null => {
  try {
      const saved = localStorage.getItem("eventFormProgress");
      if (saved) {
          const { data, lastUpdated } = JSON.parse(saved);
          // CHECK IF DATA IS OLDER THAN 24 HOURS
          const isExpired = new Date().getTime() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000;
          
          if (isExpired) {
              localStorage.removeItem("eventFormProgress");
              return null;
          }
          return data;
      }
  } catch (error) {
      console.error("Error getting form progress:", error);
      // CLEAR CORRUPTED DATA
      localStorage.removeItem("eventFormProgress");
  }
  return null;
};

// Ticket purchase flow state persistence
export const saveTicketPurchaseState = (state: {
  eventSlug: string;
  showTicketForm: boolean;
  activeStep?: number;
  selectedTicket?: { id: string; name: string; price: string; quantity: string; sold: string; details?: string };
  quantity?: number;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  totalPrice?: number;
  orderId?: string;
  additionalTicketHolders?: Array<{ name: string; email: string }>;
}) => {
  try {
    localStorage.setItem(
      "ticketPurchaseState",
      JSON.stringify({
        ...state,
        lastUpdated: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error("Error saving ticket purchase state:", error);
  }
};

export const getTicketPurchaseState = () => {
  try {
    const saved = localStorage.getItem("ticketPurchaseState");
    if (saved) {
      const data = JSON.parse(saved);
      // Check if data is older than 2 hours (shorter than form progress)
      const isExpired = new Date().getTime() - new Date(data.lastUpdated).getTime() > 2 * 60 * 60 * 1000;
      
      if (isExpired) {
        localStorage.removeItem("ticketPurchaseState");
        return null;
      }
      return data;
    }
  } catch (error) {
    console.error("Error getting ticket purchase state:", error);
    localStorage.removeItem("ticketPurchaseState");
  }
  return null;
};

export const clearTicketPurchaseState = () => {
  try {
    localStorage.removeItem("ticketPurchaseState");
  } catch (error) {
    console.error("Error clearing ticket purchase state:", error);
  }
};

// FUNCTION TO CLEAN UP ALL EXPIRED LOCALSTORAGE ITEMS
export const cleanupLocalStorage = () => {
  Object.keys(localStorage).forEach(key => {
      if (key.endsWith('Progress')) { // TARGET OUR PROGRESS KEYS
          try {
              const item = localStorage.getItem(key);
              if (item) {
                  const { lastUpdated } = JSON.parse(item);
                  if (new Date().getTime() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000) {
                      localStorage.removeItem(key);
                  }
              }
          } catch {
              // IF PARSING FAILS, REMOVE CORRUPTED DATA
              localStorage.removeItem(key);
          }
      }
  });
};