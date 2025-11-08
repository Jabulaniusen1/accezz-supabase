"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Mail, Phone, Share2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import LocationBookingModal from './LocationBookingModal';
import { Location } from '@/types/location';

interface LocationDetailContentProps {
  location: Location;
  relatedLocations: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    country: string;
    imageUrl: string | null;
    bookingPrice: string | null;
  }>;
}

const PlaceholderImage = '/accezz logo c.png';

const formatDate = (startValue: string, endValue?: string | null) => {
  const start = new Date(startValue);
  const dateLabel = start.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatTime = (value: Date) =>
    value.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!endValue) {
    return `${dateLabel} • ${formatTime(start)}`;
  }

  const end = new Date(endValue);
  if (Number.isNaN(end.getTime())) {
    return `${dateLabel} • ${formatTime(start)}`;
  }

  const sameDay = start.toDateString() === end.toDateString();
  const endSegment = sameDay
    ? formatTime(end)
    : `${end.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} ${formatTime(end)}`;

  return `${dateLabel} • ${formatTime(start)} - ${endSegment}`;
};

const formatPrice = (value: string | null | undefined) => {
  if (!value) return 'Contact for price';
  const trimmed = value.trim();
  return trimmed.startsWith('₦') ? trimmed : `₦${trimmed}`;
};

export const LocationDetailContent: React.FC<LocationDetailContentProps> = ({ location, relatedLocations }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isGalleryPreviewOpen, setIsGalleryPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const gallery = useMemo(() => {
    if (!location.gallery.length) {
      const fallback = location.defaultImageUrl || PlaceholderImage;
      return [{ id: `${location.id}-default`, imageUrl: fallback, position: 0 }];
    }
    return [...location.gallery].sort((a, b) => a.position - b.position);
  }, [location.gallery, location.defaultImageUrl, location.id]);

  useEffect(() => {
    if (!isGalleryPreviewOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGalleryPreviewOpen(false);
      }
      if (event.key === 'ArrowRight' && gallery.length > 1) {
        setPreviewIndex((prev) => (prev + 1) % gallery.length);
      }
      if (event.key === 'ArrowLeft' && gallery.length > 1) {
        setPreviewIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gallery.length, isGalleryPreviewOpen]);

  const naivePrice = location.bookingPrice?.trim();
  const priceLabel = naivePrice ? (naivePrice.startsWith('₦') ? naivePrice : `₦${naivePrice}`) : 'Contact for price';

  const primaryImage = gallery[activeImageIndex] ?? gallery[0];

  return (
    <div className="grid gap-12 sm:gap-16">
      <section className="relative overflow-hidden rounded-3xl bg-gray-900">
        <div className="relative aspect-[16/9] sm:aspect-[21/9]">
          <Image
            src={primaryImage?.imageUrl || PlaceholderImage}
            alt={location.name}
            fill
            className="object-cover"
            sizes="(min-width: 1280px) 80vw, 100vw"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>

        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
            {gallery.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setActiveImageIndex(index)}
                className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-2xl border transition ${
                  index === activeImageIndex
                    ? 'border-[#f54502] ring-2 ring-[#f54502]/40'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={image.imageUrl}
                  alt={`${location.name} preview ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr] lg:gap-10">
        <div className="space-y-8">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{location.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f54502]/10 px-3 py-1 font-medium text-[#f54502]">
                      <MapPin className="h-3.5 w-3.5" /> {location.city}, {location.country}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {priceLabel}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="inline-flex items-center rounded-full bg-[#f54502] px-5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition"
                  >
                    Book this location
                  </button>
                  {gallery.length > 0 && (
                    <button
                      onClick={() => {
                        setPreviewIndex(activeImageIndex);
                        setIsGalleryPreviewOpen(true);
                      }}
                      className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      View full gallery
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {location.description || 'No detailed description provided by the host yet.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700 dark:text-gray-200">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</p>
                <p>{location.address || `${location.city}, ${location.country}`}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Capacity</p>
                <p>{location.capacity ? `${location.capacity.toLocaleString()} guests` : 'Varies based on setup'}</p>
              </div>
            </div>
          </div>

          {!!location.eventTypes.length && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Great for</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Popular event types that work well in this venue.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {location.eventTypes.map((eventType) => (
                  <span key={eventType} className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-200">
                    {eventType}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!!(location.amenities?.length) && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Amenities available</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Everything provided by the venue to make your event seamless.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {location.amenities?.map((amenity) => (
                  <span key={amenity} className="inline-flex items-center rounded-full bg-[#f54502]/10 text-[#f54502] px-3 py-1 text-xs font-semibold">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!!location.upcomingEvents.length && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming events at this venue</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{location.upcomingEvents.length} listed</span>
              </div>
              <div className="space-y-3">
                {location.upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/${event.slug || event.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 hover:border-[#f54502]/30 hover:bg-[#f54502]/5 dark:hover:border-[#f54502]/30"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f54502] to-[#d63a02] text-xs font-semibold text-white">
                      {new Date(event.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{event.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(event.startTime, event.endTime ?? undefined)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-7 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Book this venue</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ready to host your experience? Share your event details and the venue manager will respond quickly.
            </p>
            <dl className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              {location.contactEmail && (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#f54502]" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</dt>
                    <dd>{location.contactEmail}</dd>
                  </div>
                </div>
              )}
              {location.contactPhone && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#f54502]" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd>{location.contactPhone}</dd>
                  </div>
                </div>
              )}
            </dl>
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="w-full inline-flex items-center justify-center rounded-full bg-[#f54502] px-5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition"
            >
              Request booking
            </button>
            <span className="inline-flex items-center rounded-full bg-[#f54502]/10 px-3 py-1 text-xs font-semibold text-[#f54502]">
              {priceLabel}
            </span>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-7 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Share venue</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Copy this link to send to your event partners.</p>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Share2 className="h-4 w-4" /> Copy venue link
            </button>
          </div>
        </aside>
      </section>

      {relatedLocations.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Other locations in {location.city} you may like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedLocations.map((other) => (
              <Link
                key={other.id}
                href={`/locations/${other.slug}`}
                className="group overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={other.imageUrl || PlaceholderImage}
                    alt={other.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white">
                    {other.city}, {other.country}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{other.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatPrice(other.bookingPrice)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <LocationBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        location={location}
      />

      <AnimatePresence>
        {isGalleryPreviewOpen && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsGalleryPreviewOpen(false)}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsGalleryPreviewOpen(false);
              }}
              className="absolute top-6 right-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close gallery preview"
            >
              <X className="h-5 w-5" />
            </button>

            {gallery.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
                }}
                className="absolute left-4 sm:left-8 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={gallery[previewIndex]?.imageUrl || PlaceholderImage}
                  alt={`${location.name} gallery image ${previewIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  unoptimized
                />
              </div>
              {gallery.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 bg-black/60 px-4 py-3">
                  {gallery.map((image, index) => (
                    <button
                      key={`preview-${image.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreviewIndex(index);
                      }}
                      className={`relative h-14 w-20 overflow-hidden rounded-xl border transition ${
                        index === previewIndex ? 'border-[#f54502] ring-2 ring-[#f54502]/50' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`Preview image ${index + 1}`}
                    >
                      <Image
                        src={image.imageUrl}
                        alt={`${location.name} thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewIndex((prev) => (prev + 1) % gallery.length);
                }}
                className="absolute right-4 sm:right-8 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationDetailContent;

