import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import LocationDetailContent from '../components/LocationDetailContent';
import { Location } from '@/types/location';
import { BiArrowBack } from 'react-icons/bi';

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
  }
);

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

interface LocationPageProps {
  params: { slug: string };
}

export const revalidate = 60;

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const { slug } = params;
  const { data } = await supabaseServer
    .from('locations')
    .select('name, city, country, description')
    .eq('slug', slug)
    .maybeSingle();

  if (!data) {
    return {
      title: 'Location not found',
    };
  }

  return {
    title: `${data.name} | Accezz Locations`,
    description:
      data.description?.slice(0, 150) || `Discover ${data.name} for your next event in ${data.city}, ${data.country}.`,
  };
}

export default async function LocationDetailPage({ params }: LocationPageProps) {
  const { slug } = params;

  const { data: locationRow, error } = await supabaseServer
    .from('locations')
    .select(`
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
      location_gallery (id, image_url, position),
      events:events_location_id_fkey (id, title, slug, date, time, image_url, status, visibility)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!locationRow) {
    notFound();
  }

  const gallery: Location['gallery'] = (locationRow.location_gallery ?? [])
    .map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      position: image.position,
    }))
    .sort((a, b) => a.position - b.position);

  const upcomingEvents: Location['upcomingEvents'] = (locationRow.events ?? [])
    .filter((event) => event && event.status === 'published' && event.visibility === 'public')
    .map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      date: event.date,
      time: event.time,
      imageUrl: event.image_url,
      status: event.status,
      visibility: event.visibility,
    }));

  const location: Location = {
    id: locationRow.id,
    userId: locationRow.user_id,
    name: locationRow.name,
    slug: locationRow.slug,
    description: locationRow.description ?? undefined,
    country: locationRow.country,
    city: locationRow.city,
    address: locationRow.address ?? undefined,
    latitude: locationRow.latitude ?? undefined,
    longitude: locationRow.longitude ?? undefined,
    capacity: locationRow.capacity ?? undefined,
    amenities: mapAmenities(locationRow.amenities),
    eventTypes: Array.isArray(locationRow.event_types) ? locationRow.event_types : [],
    bookingPrice: locationRow.booking_price ?? null,
    contactEmail: locationRow.contact_email ?? undefined,
    contactPhone: locationRow.contact_phone ?? undefined,
    defaultImageUrl: locationRow.default_image_url ?? undefined,
    socialLinks: {
      facebook: locationRow.facebook_url ?? undefined,
      instagram: locationRow.instagram_url ?? undefined,
      tiktok: locationRow.tiktok_url ?? undefined,
      x: locationRow.x_url ?? undefined,
    },
    galleryCount: locationRow.gallery_count,
    isActive: locationRow.is_active,
    createdAt: locationRow.created_at,
    updatedAt: locationRow.updated_at,
    gallery,
    upcomingEvents,
  };

  const { data: relatedLocations } = await supabaseServer
    .from('locations')
    .select(`
      id,
      name,
      slug,
      city,
      country,
      default_image_url,
      booking_price
    `)
    .eq('is_active', true)
    .eq('city', location.city)
    .neq('id', location.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const otherLocations: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    country: string;
    imageUrl: string | null;
    bookingPrice: string | null;
  }> = (relatedLocations ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    city: loc.city,
    country: loc.country,
    imageUrl: loc.default_image_url ?? null,
    bookingPrice: loc.booking_price ?? null,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <Link
        href="/locations"
        className="inline-flex items-center space-x-1 sm:space-x-2 text-gray-600 dark:text-gray-300 hover:text-[#f54502] dark:hover:text-[#f54502] transition-colors text-sm sm:text-base"
      >
        <BiArrowBack className="text-lg sm:text-xl" />
        <span className="hidden sm:inline">Back</span>
      </Link>
      <LocationDetailContent location={location} relatedLocations={otherLocations} />
    </div>
  );
}

