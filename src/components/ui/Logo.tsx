'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  /**
   * Variant of logo to use (for styling purposes only)
   * - 'default': Standard logo styling
   * - 'white': White logo styling
   * Note: Both variants use the same logo image (/accezz c l.png)
   */
  variant?: 'default' | 'white';
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Logo component with automatic fallback handling.
 * If the primary logo fails to load, it automatically tries fallback logos.
 * This ensures a logo always displays, even if some image files are missing.
 */
export default function Logo({
  variant: _variant = 'default',
  width = 180,
  height = 130,
  fill = false,
  className = '',
  alt = 'Accezz Logo',
  priority = false,
  sizes,
}: LogoProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('/accezzlive cl.png');
  const [errorCount, setErrorCount] = useState(0);

  // Fallback order: Primary logo -> Alternative logos
  const fallbacks = [
    '/accezzlive cl.png',
    // '/accezz logo c.png',
    // '/accezz logo.png',
    // '/logo.png',
    // '/logoi.png',
  ];

  const handleError = () => {
    const nextIndex = errorCount + 1;
    if (nextIndex < fallbacks.length) {
      setCurrentSrc(fallbacks[nextIndex]);
      setErrorCount(nextIndex);
    }
    // If all fallbacks fail, the Image component will handle it gracefully
  };

  const imageProps: {
    src: string;
    alt: string;
    className: string;
    priority: boolean;
    onError: () => void;
    fill?: boolean;
    sizes?: string;
    width?: number;
    height?: number;
  } = {
    src: currentSrc,
    alt,
    className,
    priority,
    onError: handleError,
  };

  if (fill) {
    imageProps.fill = true;
    if (sizes) imageProps.sizes = sizes;
  } else {
    imageProps.width = width;
    imageProps.height = height;
  }

  return <Image {...imageProps} />;
}

