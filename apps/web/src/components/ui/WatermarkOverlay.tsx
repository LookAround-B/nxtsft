/**
 * "NxtSft.com" watermark overlaid on property images at display time.
 *
 * This is the single source of the mark — photos are no longer watermarked into
 * their pixels at upload (that baked the brand in at a fixed weight and caused
 * double-stamping). Rendering it here keeps every listing image uniform and lets
 * the weight/size change in one place. Parent must be `position: relative`.
 *
 * SVG so the text scales with the container: the viewBox + textLength pin the
 * word to the full viewBox width, and the wrapper's width sizes it relative
 * to the image.
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
