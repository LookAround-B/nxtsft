"use client";
import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { MAPBOX_TOKEN, MAP_STYLE, hasMapboxToken, resolveCoords } from "@/lib/map";

type PropertyMapProps = {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  /** Used for deterministic fallback jitter (e.g. property id). */
  seed?: string;
  label?: string;
  className?: string;
};

/** Single-pin map for a property detail page. */
export function PropertyMap({ lat, lng, city, seed, label, className }: PropertyMapProps) {
  if (!hasMapboxToken()) return <MapUnavailable city={city} />;

  const { coords, approximate } = resolveCoords({ lat, lng, city, seed });

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border ${className ?? "h-72"}`}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: coords.lng, latitude: coords.lat, zoom: approximate ? 11 : 14 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker longitude={coords.lng} latitude={coords.lat} anchor="bottom">
          <div className="flex flex-col items-center drop-shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent ring-4 ring-white">
              <MapPin size={18} className="text-white" />
            </div>
            <div className="-mt-1 h-2 w-2 rotate-45 bg-accent" />
          </div>
        </Marker>
      </Map>

      {label && (
        <div className="absolute left-3 top-3 max-w-[70%] rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-sm backdrop-blur-sm">
          {label}
        </div>
      )}
      {approximate && (
        <div className="absolute bottom-3 left-3 rounded-md bg-navy/80 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          Approximate location — exact coordinates pending
        </div>
      )}
    </div>
  );
}

function MapUnavailable({ city }: { city?: string | null }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 text-center">
      <MapPin size={22} className="text-muted-foreground/50" />
      <p className="text-sm font-semibold text-muted-foreground">Map unavailable</p>
      <p className="max-w-xs text-xs text-muted-foreground/80">
        {city ? `${city} · ` : ""}Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the location map.
      </p>
    </div>
  );
}
