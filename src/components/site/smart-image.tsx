'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn, normalizeImageUrl } from '@/lib/utils';

interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  gradient?: string;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
}

// Renders an image with a premium gradient fallback while loading or on error.
export function SmartImage({ src, alt, className, imgClassName, gradient = 'from-primary/30 via-chart-2/20 to-chart-3/20', priority = false, fetchPriority, sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" }: SmartImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', gradient, className)}>
      {/* Decorative pattern overlay for fallback */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      {!error && src && (
        <Image
          src={normalizeImageUrl(src) as string}
          alt={alt}
          fill
          priority={priority}
          fetchPriority={fetchPriority}
          sizes={sizes}
          onError={() => setError(true)}
          onLoad={() => setLoaded(true)}
          className={cn(
            'object-cover transition-opacity duration-500',
            (loaded || priority) ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
        />
      )}
    </div>
  );
}
