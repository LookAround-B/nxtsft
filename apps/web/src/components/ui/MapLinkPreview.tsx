"use client";
import { MAPBOX_TOKEN } from "@/lib/map";
import { LinkPreview } from "@/components/ui/LinkPreview";

/**
 * LinkPreview specialised for map links: the hover card shows a Mapbox
 * static-image thumbnail with a pin. Uses the Mapbox Static Images API —
 * already covered by the CSP img-src allowlist — instead of a third-party
 * screenshot service. Renders as a plain link when no token is configured.
 */
export function MapLinkPreview({
  href,
  lat,
  lng,
  className = "",
  children,
}: {
  href: string;
  lat: number;
  lng: number;
  className?: string;
  children: React.ReactNode;
}) {
  const img = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+e11d48(${lng},${lat})/${lng},${lat},14.5/320x180@2x?access_token=${MAPBOX_TOKEN}`
    : null;

  return (
    <LinkPreview
      href={href}
      className={className}
      preview={
        img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            loading="lazy"
            width={320}
            height={180}
            className="block h-auto w-64 rounded-lg"
          />
        )
      }
    >
      {children}
    </LinkPreview>
  );
}
