// types/event.ts
export interface Ticket {
  // id: string;
  name: string;
  price: string;
  quantity: string;
  sold: string;
  details?: string; // Made optional
  attendees?: { name: string; email: string }[];
}



export interface VirtualEventDetails {
  platform?: 'google-meet' | 'zoom' | 'meets' | 'custom';
  meetingUrl?: string;
  meetingId?: string;
}

export interface SocialMediaLinks {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

export interface Event {
  id?: string;
  title: string;
  slug?: string;
  description: string;
  price?: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  hostName: string;
  image: File | string | null;
  gallery: File[] ;
  ticketType: Ticket[];
  socialMediaLinks?: SocialMediaLinks;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  country?: string;
  currency?: string;
  isVirtual: boolean;
  virtualEventDetails?: VirtualEventDetails;
}

export interface ToastProps {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose: () => void;
}

export type TrendingEvent = Event;