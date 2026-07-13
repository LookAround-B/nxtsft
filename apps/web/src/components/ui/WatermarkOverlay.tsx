/**
 * "NxtSft.com" watermark overlaid on property images at display time.
 *
 * Uploads since LA-298 get the mark baked into the JPEG, but older listings
 * (seeded placeholders, imported Unsplash URLs) predate that — this overlay
 * guarantees every property image shows the brand regardless of source.
 *
 * SVG so the text scales with the container: the viewBox + textLength pin the
 * word to the full viewBox width, and the wrapper's width sizes it relative
 * to the image. Parent must be `position: relative`.
 */
export function WatermarkOverlay({ className = "" }: { className?: string }) {
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
        fontWeight="700"
        fontSize="17"
        fill="#ffffff"
        opacity="0.55"
      >
        NxtSft.com
      </text>
    </svg>
  );
}
