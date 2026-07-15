/**
 * "NxtSft.com" watermark overlaid on property images at display time — but only
 * for images that don't already carry the mark baked into their pixels.
 *
 * Uploaded photos are watermarked at upload (compressImage, LA-298) and live on
 * our R2 CDN, so they need no overlay — rendering one anyway double-stamped them
 * (a visible "ghost"/shadow). Seeded/demo listings use external stock URLs
 * (Unsplash) or local placeholders with no baked mark, so those still get the
 * overlay. Pass the image's `src` and we skip the overlay when it's a baked R2
 * asset. Parent must be `position: relative`.
 *
 * SVG so the text scales with the container: the viewBox + textLength pin the
 * word to the full viewBox width, and the wrapper's width sizes it relative
 * to the image.
 */

// Cloudflare R2 default hosts, plus the configured custom domain (e.g.
// media.nxtsft.com) exposed via next.config. Any image served from these is a
// baked upload; everything else (Unsplash, /categories/*.png) is not.
const R2_HOST_SUFFIXES = [".r2.dev", ".r2.cloudflarecontent.com"];
const R2_PUBLIC_HOST = (process.env.NEXT_PUBLIC_R2_HOST ?? "").toLowerCase();

function isBakedUpload(src?: string): boolean {
  if (!src) return false;
  let host: string;
  try {
    // Base handles relative paths ("/categories/apartment.png") — they resolve
    // to the sentinel host and count as not-baked.
    host = new URL(src, "https://_relative_").hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "_relative_") return false;
  if (R2_PUBLIC_HOST && host === R2_PUBLIC_HOST) return true;
  return R2_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

export function WatermarkOverlay({ src, className = "" }: { src?: string; className?: string }) {
  if (isBakedUpload(src)) return null;
  return (
    <svg
      viewBox="0 0 100 20"
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-[1] m-auto h-auto w-[49.5%] select-none ${className}`}
    >
      <text
        x="50"
        y="10"
        textAnchor="middle"
        dominantBaseline="central"
        textLength="98"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Arial, sans-serif"
        fontWeight="500"
        fontSize="17"
        fill="#ffffff"
        opacity="0.55"
      >
        NxtSft.com
      </text>
    </svg>
  );
}
