"use client";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMemo, useState } from "react";
import MapGL, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import {
  MAPBOX_TOKEN,
  MAP_STYLE,
  hasMapboxToken,
  resolveCoords,
  fitView,
  categoryColor,
} from "@/lib/map";

export type VisitPoint = {
  id: string;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  locality?: string | null;
  rep: string;
  property: string;
  status: string;
  scheduledAt: string;
};

/** Multi-pin map of site visits, colour-coded by sales rep. */
export function VisitsMap({ visits, className }: { visits: VisitPoint[]; className?: string }) {
  const [active, setActive] = useState<string | null>(null);

  const points = useMemo(
    () =>
      visits.map((v) => {
        const { coords, approximate } = resolveCoords({
          lat: v.lat,
          lng: v.lng,
          city: v.city,
          seed: v.id,
        });
        return { ...v, ...coords, approximate, color: categoryColor(v.rep) };
      }),
    [visits],
  );

  const reps = useMemo(() => {
    const seen = new Map<string, ReturnType<typeof categoryColor>>();
    for (const p of points) if (!seen.has(p.rep)) seen.set(p.rep, p.color);
    return [...seen.entries()];
  }, [points]);

  const initialView = useMemo(() => fitView(points.map((p) => ({ lng: p.lng, lat: p.lat }))), [points]);

  if (!hasMapboxToken()) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 text-center">
        <MapPin size={22} className="text-muted-foreground/50" />
        <p className="text-sm font-semibold text-muted-foreground">Map unavailable</p>
        <p className="max-w-xs text-xs text-muted-foreground/80">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the geographic visit map.
        </p>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 text-center">
        <MapPin size={22} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No site visits to plot yet.</p>
      </div>
    );
  }

  const activePoint = points.find((p) => p.id === active) ?? null;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border ${className ?? "h-96"}`}>
      <MapGL
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialView}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />

        {points.map((p) => (
          <Marker
            key={p.id}
            longitude={p.lng}
            latitude={p.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setActive(p.id);
            }}
          >
            <div className="flex cursor-pointer flex-col items-center drop-shadow-md transition-transform hover:scale-110">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white"
                style={{ backgroundColor: p.color.hex }}
              >
                <MapPin size={14} className="text-white" />
              </div>
              <div className="-mt-1 h-1.5 w-1.5 rotate-45" style={{ backgroundColor: p.color.hex }} />
            </div>
          </Marker>
        ))}

        {activePoint && (
          <Popup
            longitude={activePoint.lng}
            latitude={activePoint.lat}
            anchor="bottom"
            offset={28}
            closeButton
            closeOnClick={false}
            onClose={() => setActive(null)}
            maxWidth="240px"
          >
            <div className="space-y-1 p-0.5">
              <div className="text-sm font-bold text-navy">{activePoint.property}</div>
              <div className="text-xs text-muted-foreground">
                {[activePoint.locality, activePoint.city].filter(Boolean).join(", ") || "—"}
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activePoint.color.hex }} />
                <span className="font-semibold text-navy">{activePoint.rep}</span>
                <span className="text-muted-foreground">· {activePoint.status}</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {new Date(activePoint.scheduledAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              {activePoint.approximate && (
                <div className="text-[10px] italic text-muted-foreground/70">Approximate location</div>
              )}
            </div>
          </Popup>
        )}
      </MapGL>

      {/* Rep legend */}
      <div className="absolute bottom-3 left-3 max-w-[60%] rounded-lg bg-white/90 p-2.5 shadow-sm backdrop-blur-sm">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Sales Rep
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {reps.map(([rep, color]) => (
            <span key={rep} className="flex items-center gap-1.5 text-xs font-medium text-navy">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
              {rep}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
