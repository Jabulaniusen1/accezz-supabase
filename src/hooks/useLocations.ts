import { useMutation, useQuery, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { notifyLocationBooking } from '@/utils/notificationClient';
import {
  Location,
  LocationBooking,
  LocationBookingStatus,
  LocationBookingWithLocation,
  LocationFilter,
  LocationImage,
  LocationEventSummary,
} from '@/types/location';

type SupabaseLocationRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string | null;
  country: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  amenities?: unknown;
  event_types?: string[] | null;
  booking_price?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  default_image_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  x_url?: string | null;
  gallery_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  location_gallery?: SupabaseLocationGalleryRow[];
  events?: SupabaseEventRow[];
};

type SupabaseLocationGalleryRow = {
  id: string;
  location_id: string;
  image_url: string;
  position: number;
};

type SupabaseEventRow = {
  id: string;
  slug?: string | null;
  title: string;
  start_time: string;
  end_time?: string | null;
  image_url?: string | null;
  status: string;
  visibility: string;
};

const mapAmenities = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value as string[];
  }
  if (typeof value === 'object' && value !== null) {
    const maybeArray = Object.values(value);
    if (maybeArray.every((item) => typeof item === 'string')) {
      return maybeArray as string[];
    }
  }
  return undefined;
};

const mapLocation = (row: SupabaseLocationRow): Location => {
  const gallery: LocationImage[] = (row.location_gallery || [])
    .map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      position: image.position,
    }))
    .sort((a, b) => a.position - b.position);

  const upcomingEvents: LocationEventSummary[] = (row.events || [])
    .filter((event) => event.status === 'published' && event.visibility === 'public')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug ?? null,
      startTime: event.start_time,
      endTime: event.end_time ?? null,
      imageUrl: event.image_url ?? null,
      status: event.status,
      visibility: event.visibility,
    }));

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    country: row.country,
    city: row.city,
    address: row.address ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    capacity: row.capacity ?? null,
    amenities: mapAmenities(row.amenities),
  eventTypes: Array.isArray(row.event_types) ? row.event_types : [],
    bookingPrice: row.booking_price ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    defaultImageUrl: row.default_image_url ?? null,
  socialLinks: {
    facebook: row.facebook_url ?? null,
    instagram: row.instagram_url ?? null,
    tiktok: row.tiktok_url ?? null,
    x: row.x_url ?? null,
  },
    galleryCount: row.gallery_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gallery,
    upcomingEvents,
  };
};

const buildLocationSelect = () => `
  id,
  user_id,
  name,
  slug,
  description,
  country,
  city,
  address,
  latitude,
  longitude,
  capacity,
  amenities,
  event_types,
  booking_price,
  contact_email,
  contact_phone,
  default_image_url,
  facebook_url,
  instagram_url,
  tiktok_url,
  x_url,
  gallery_count,
  is_active,
  created_at,
  updated_at,
  location_gallery (*),
  events:events_location_id_fkey (id, slug, title, start_time, end_time, image_url, status, visibility)
`;

export const fetchLocations = async (filters: LocationFilter = {}): Promise<Location[]> => {
  let query = supabase
    .from('locations')
    .select(buildLocationSelect())
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters.country) {
    query = query.eq('country', filters.country);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapLocation(row as unknown as SupabaseLocationRow));
};

export const useLocations = (
  filters: LocationFilter,
  options?: UseQueryOptions<Location[], Error>
) => {
  return useQuery<Location[], Error>({
    queryKey: ['locations', filters],
    queryFn: () => fetchLocations(filters),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const fetchMyLocations = async (): Promise<Location[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('locations')
    .select(buildLocationSelect())
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapLocation(row as unknown as SupabaseLocationRow));
};

export const useMyLocations = (options?: UseQueryOptions<Location[], Error>) => {
  return useQuery<Location[], Error>({
    queryKey: ['my-locations'],
    queryFn: fetchMyLocations,
    ...options,
  });
};

export const fetchLocationBookings = async (): Promise<LocationBookingWithLocation[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('location_bookings')
    .select(`
      id,
      location_id,
      requester_user_id,
      requester_name,
      requester_email,
      requester_phone,
      event_type,
      event_date,
      start_time,
      end_time,
      notes,
      status,
      created_at,
      updated_at,
      location:locations (id, name, city, country)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((row) => row.location && typeof row.location === 'object')
    .map((row) => ({
      id: row.id,
      locationId: row.location_id,
      requesterUserId: row.requester_user_id ?? null,
      requesterName: row.requester_name ?? null,
      requesterEmail: row.requester_email ?? null,
      requesterPhone: row.requester_phone ?? null,
      eventType: row.event_type ?? null,
      eventDate: row.event_date,
      startTime: row.start_time ?? null,
      endTime: row.end_time ?? null,
      notes: row.notes ?? null,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      location: {
        id: row.location?.[0]?.id,
        name: row.location?.[0]?.name,
        city: row.location?.[0]?.city,
        country: row.location?.[0]?.country,
      },
    }));
};

export const useLocationBookings = (options?: UseQueryOptions<LocationBookingWithLocation[], Error>) => {
  return useQuery<LocationBookingWithLocation[], Error>({
    queryKey: ['location-bookings'],
    queryFn: fetchLocationBookings,
    ...options,
  });
};

type CreateBookingPayload = {
  locationId: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  eventType?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export const createLocationBooking = async (payload: CreateBookingPayload): Promise<LocationBooking> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const insertPayload = {
    location_id: payload.locationId,
    requester_name: payload.requesterName || null,
    requester_email: payload.requesterEmail || null,
    requester_phone: payload.requesterPhone || null,
    event_type: payload.eventType || null,
    event_date: payload.eventDate,
    start_time: payload.startTime || null,
    end_time: payload.endTime || null,
    notes: payload.notes || null,
    requester_user_id: session?.user?.id || null,
  };

  const { data, error } = await supabase
    .from('location_bookings')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  if (data?.id) {
    await notifyLocationBooking(data.id);
  }

  return {
    id: data.id,
    locationId: data.location_id,
    requesterUserId: data.requester_user_id,
    requesterName: data.requester_name,
    requesterEmail: data.requester_email,
    requesterPhone: data.requester_phone,
    eventType: data.event_type,
    eventDate: data.event_date,
    startTime: data.start_time,
    endTime: data.end_time,
    notes: data.notes,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

type UpdateBookingStatusPayload = {
  id: string;
  status: LocationBookingStatus;
};

export const updateLocationBookingStatus = async ({ id, status }: UpdateBookingStatusPayload) => {
  const { data, error } = await supabase
    .from('location_bookings')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LocationBooking;
};

export const useUpdateLocationBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLocationBookingStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-bookings'] });
    },
  });
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  if (!locationId) {
    throw new Error('Location id is required to delete a location.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('You must be logged in to delete a location.');
  }

  const ownerId = session.user.id;
  const basePath = `locations/${ownerId}/${locationId}`;

  const { data: fileList, error: listError } = await supabase.storage
    .from('locations-images')
    .list(basePath, { limit: 1000, offset: 0 });

  if (listError && listError.message !== 'The resource was not found') {
    throw listError;
  }

  if (fileList && fileList.length > 0) {
    const pathsToRemove = fileList.map((file) => `${basePath}/${file.name}`);
    const { error: removeError } = await supabase.storage.from('locations-images').remove(pathsToRemove);
    if (removeError) {
      throw removeError;
    }
  }

  const { error: deleteError } = await supabase.from('locations').delete().eq('id', locationId);
  if (deleteError) {
    throw deleteError;
  }
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
};

