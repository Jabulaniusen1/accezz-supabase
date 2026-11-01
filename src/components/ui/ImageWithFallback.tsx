'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

type ImageWithFallbackProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
};

/**
 * next/image that shows a neutral placeholder (faded wordmark on grey) when
 * there is no image or it fails to load, instead of broken-image alt text or
 * a stretched logo.
 */
export default function ImageWithFallback({ src, alt, className = '', fill, ...props }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${fill ? 'absolute inset-0' : ''} ${className}`}
      >
        <Image
          src="/accezz logo c.png"
          alt=""
          width={1383}
          height={512}
          className="h-auto w-1/3 max-w-[96px] opacity-30 grayscale"
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
