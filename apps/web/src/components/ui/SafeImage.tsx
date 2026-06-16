"use client";
import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

/** Shown when a property image URL fails to load (dead Unsplash id, 404, etc.). */
export const IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80&auto=format&fit=crop";

/**
 * Drop-in replacement for next/image that degrades to a placeholder instead of
 * rendering a broken/empty box when the source fails to load.
 */
export function SafeImage({
  src,
  fallback = IMAGE_FALLBACK,
  alt,
  ...props
}: ImageProps & { fallback?: string }) {
  const [current, setCurrent] = useState<ImageProps["src"]>(src);

  // Reset when the incoming src changes (e.g. carousel navigation).
  useEffect(() => setCurrent(src), [src]);

  return (
    <Image
      {...props}
      alt={alt}
      src={current}
      onError={() => setCurrent(fallback)}
    />
  );
}
