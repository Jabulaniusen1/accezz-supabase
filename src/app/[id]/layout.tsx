import { Metadata } from 'next';
import { fetchEventBySlug } from '@/utils/eventUtils';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEventBySlug(id);

  if (!event) {
    // Fallback to default metadata if event not found
    return {
      title: 'Event Not Found | Accezz',
      description: 'The event you are looking for could not be found.',
    };
  }

  // Get the event image URL - images from database are always URLs
  // Supabase storage URLs are already absolute URLs, so we can use them directly
  const eventImageUrl = typeof event.image === 'string' && event.image 
    ? event.image 
    : null;

  // Ensure absolute URL for Open Graph images
  // Use the event image if available, otherwise fallback to default OG image
  const imageUrl = eventImageUrl 
    ? eventImageUrl.startsWith('http') 
      ? eventImageUrl 
      : `https://accezzlive.com${eventImageUrl.startsWith('/') ? '' : '/'}${eventImageUrl}`
    : 'https://accezzlive.com/og-image.jpg'; // Fallback to default OG image

  // Format date for description
  const startDate = event.startTime ? new Date(event.startTime) : null;
  const formattedDate = startDate 
    ? startDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : '';

  // Format time for description
  const formattedTime = startDate 
    ? startDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    : '';

  // Build location info
  const locationInfo = event.location 
    ? event.isVirtual 
      ? 'Virtual Event' 
      : `${event.city || ''}${event.city && event.country ? ', ' : ''}${event.country || ''}`.trim() || event.location
    : '';

  // Create rich description
  const eventDescription = event.description 
    ? event.description.length > 200 
      ? event.description.substring(0, 197) + '...'
      : event.description
    : `Join us for ${event.title}${formattedDate ? ` on ${formattedDate}` : ''}${formattedTime ? ` at ${formattedTime}` : ''}${locationInfo ? ` in ${locationInfo}` : ''}. Get your tickets now!`;

  // Build the event URL - id is the event slug
  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://accezzlive.com'}/${id}`;

  return {
    title: event.title,
    description: eventDescription,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: eventUrl,
      siteName: 'Accezz',
      title: event.title,
      description: eventDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: eventDescription,
      images: [imageUrl],
      creator: '@accezz',
      site: '@accezz',
    },
    alternates: {
      canonical: eventUrl,
    },
  };
}

export default function EventLayout({ children }: EventLayoutProps) {
  return <>{children}</>;
}

