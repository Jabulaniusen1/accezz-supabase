// components/EventGallerySection.tsx
import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';

interface EventGallerySectionProps {
  event: Event;
}

export default function EventGallerySection({ event }: EventGallerySectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Duplicate images for seamless infinite scroll
  const duplicatedImages = event?.gallery ? [...event.gallery, ...event.gallery] : [];

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // Auto-scroll animation
    const scroll = () => {
      if (carousel.scrollLeft >= carousel.scrollWidth / 2) {
        carousel.scrollLeft = 0;
      } else {
        carousel.scrollLeft += 1;
      }
    };

    const interval = setInterval(scroll, 20);

    return () => clearInterval(interval);
  }, []);

  if (!event?.gallery || event.gallery.length === 0) return null;

  return (
    <div className="text-center mt-20 mb-32 px-4">
      <motion.h2 
        className="text-3xl font-bold mb-8 text-gray-800 dark:text-white"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        GALLERY
      </motion.h2>
      
      <div className="relative overflow-hidden">
        
        <div 
          ref={carouselRef}
          className="flex gap-6 overflow-x-hidden scrollbar-hide"
          style={{ 
            scrollBehavior: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {duplicatedImages.map((img: string | File, index: number) => (
            <motion.div
              key={`${index}-${typeof img === 'string' ? img : img.name}`}
              className="flex-shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative group">
                <Image 
                  src={typeof img === 'string' ? img : URL.createObjectURL(img)} 
                  alt={`${event.title} gallery ${index + 1}`} 
                  width={400} 
                  height={300}
                  className="w-[400px] h-[400px] object-cover rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-2xl"
                  style={{ 
                    borderRadius: '12px',
                  }} 
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-xl flex items-center justify-center">
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scroll indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {event.gallery.slice(0, 5).map((_, index) => (
          <div 
            key={index}
            className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"
            style={{ animationDelay: `${index * 0.2}s` }}
          />
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};