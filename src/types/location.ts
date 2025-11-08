export interface LocationImage {
  id: string;
  imageUrl: string;
  position: number;
}

export interface LocationEventSummary {
  id: string;
  title: string;
  slug?: string | null;
  startTime: string;
  endTime?: string | null;
  imageUrl?: string | null;
  status: string;
  visibility: string;
}

export interface Location {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string | null;
  country: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  amenities?: string[];
  eventTypes: string[];
  bookingPrice?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  defaultImageUrl?: string | null;
  socialLinks: {
    facebook?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    x?: string | null;
  };
  galleryCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  gallery: LocationImage[];
  upcomingEvents: LocationEventSummary[];
}

export type LocationFilter = {
  country?: string;
  city?: string;
};

export type LocationBookingStatus = 'pending' | 'accepted' | 'declined';

export interface LocationBooking {
  id: string;
  locationId: string;
  requesterUserId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  eventType?: string | null;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  status: LocationBookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LocationBookingWithLocation extends LocationBooking {
  location: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
}

