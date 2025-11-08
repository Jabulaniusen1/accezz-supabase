"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Location } from '@/types/location';

interface LocationCardProps {
  location: Location;
}

const PlaceholderImage = '/accezz logo c.png';

export const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const gallery = useMemo(() => {
    if (location.gallery.length === 0) {
      const fallback = location.defaultImageUrl || PlaceholderImage;
      return [{ id: `${location.id}-default`, imageUrl: fallback, position: 0 }];
    }
    return location.gallery;
  }, [location.gallery, location.defaultImageUrl, location.id]);

  const currentImage = gallery[activeImageIndex] ?? gallery[0];

  const eventTypes = useMemo(() => {
    if (!location.eventTypes?.length) return [];
    return location.eventTypes.slice(0, 2);
  }, [location.eventTypes]);

  const formattedPrice = location.bookingPrice?.trim();
  const priceLabel = formattedPrice ? (formattedPrice.startsWith('₦') ? formattedPrice : `₦${formattedPrice}`) : 'Contact for price';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={currentImage?.imageUrl || PlaceholderImage}
            alt={location.name}
            fill
            className="object-cover"
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            priority={false}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-gray-800 shadow">
            {location.city}, {location.country}
          </div>
        </div>

        {gallery.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
            {gallery.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setActiveImageIndex(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === activeImageIndex ? 'bg-white w-4' : 'bg-white/60 hover:bg-white'
                }`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{location.name}</h3>
            {eventTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {eventTypes.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-200"
                  >
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-[#f54502] whitespace-nowrap">{priceLabel}</span>
        </div>
        {location.address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{location.address}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          {location.capacity ? (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Capacity: {location.capacity.toLocaleString()}</span>
          ) : (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Capacity varies</span>
          )}
          <Link
            href={`/locations/${location.slug || location.id}`}
            className="inline-flex items-center rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-3 py-1 text-xs font-semibold hover:opacity-90"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LocationCard;

