/**
 * ─── Map configuration & coordinate helpers ─────────────────────────────
 *
 * Single source of truth for everything Mapbox. Components import from here
 * so swapping providers (or the token) is a one-file change.
 *
 * Token: set NEXT_PUBLIC_MAPBOX_TOKEN in apps/web/.env.local (and in the
 * Vercel project env). The NEXT_PUBLIC_ prefix exposes it to the browser
 * bundle automatically — no next.config change needed.
 */

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Default Mapbox style — streets reads best for property/locality context. */
export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

export function hasMapboxToken(): boolean {
  return MAPBOX_TOKEN.trim().length > 0;
}

export type LngLat = { lng: number; lat: number };

/**
 * Approximate city centroids (lng/lat) for the cities NxtSft operates in.
 * Used as a fallback when a listing has no real coordinates yet, so pins land
 * in the correct city instead of stacking at 0,0 (the Gulf of Guinea).
 */
const CITY_CENTROIDS: Record<string, LngLat> = {
  mumbai: { lng: 72.8777, lat: 19.076 },
  pune: { lng: 73.8567, lat: 18.5204 },
  bengaluru: { lng: 77.5946, lat: 12.9716 },
  bangalore: { lng: 77.5946, lat: 12.9716 },
  delhi: { lng: 77.209, lat: 28.6139 },
  "delhi ncr": { lng: 77.209, lat: 28.6139 },
  "new delhi": { lng: 77.209, lat: 28.6139 },
  noida: { lng: 77.391, lat: 28.5355 },
  gurgaon: { lng: 77.0266, lat: 28.4595 },
  gurugram: { lng: 77.0266, lat: 28.4595 },
  hyderabad: { lng: 78.4867, lat: 17.385 },
  chennai: { lng: 80.2707, lat: 13.0827 },
  kolkata: { lng: 88.3639, lat: 22.5726 },
  ahmedabad: { lng: 72.5714, lat: 23.0225 },
  surat: { lng: 72.8311, lat: 21.1702 },
  jaipur: { lng: 75.7873, lat: 26.9124 },
  lucknow: { lng: 80.9462, lat: 26.8467 },
  kochi: { lng: 76.2673, lat: 9.9312 },
  coimbatore: { lng: 76.9558, lat: 11.0168 },
  nagpur: { lng: 79.0882, lat: 21.1458 },
  indore: { lng: 75.8577, lat: 22.7196 },
  chandigarh: { lng: 76.7794, lat: 30.7333 },
};

/** Geographic centre of India — last-resort fallback. */
export const INDIA_CENTROID: LngLat = { lng: 78.9629, lat: 22.5937 };

function lookupCity(city?: string | null): LngLat | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  if (CITY_CENTROIDS[key]) return CITY_CENTROIDS[key];
  // partial match — e.g. "Bandra West, Mumbai" → mumbai
  for (const name of Object.keys(CITY_CENTROIDS)) {
    if (key.includes(name)) return CITY_CENTROIDS[name];
  }
  return null;
}

/** Deterministic 0..1 hash of a string (FNV-1a style). */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // map to 0..1
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Small deterministic offset (~±2.5km) so multiple fallback pins in the same
 * city don't perfectly overlap. Stable per seed (e.g. listing id).
 */
function jitter(seed: string, amount = 0.025): LngLat {
  return {
    lng: (hash01(seed + "x") - 0.5) * 2 * amount,
    lat: (hash01(seed + "y") - 0.5) * 2 * amount,
  };
}

function isValidCoord(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) > 0.01 && Math.abs(v) <= max;
}

/**
 * Resolve the best available coordinates for a point.
 * Returns `approximate: true` when we fell back to a city centroid, so the UI
 * can be honest about precision (important for a real-estate product).
 */
export function resolveCoords(opts: {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  seed?: string;
}): { coords: LngLat; approximate: boolean } {
  const { lat, lng, city, seed = "" } = opts;

  if (isValidCoord(lat, 90) && isValidCoord(lng, 180)) {
    return { coords: { lng, lat }, approximate: false };
  }

  const base = lookupCity(city) ?? INDIA_CENTROID;
  const j = jitter(seed || city || "nxtsft");
  return { coords: { lng: base.lng + j.lng, lat: base.lat + j.lat }, approximate: true };
}

/**
 * Parse a lat/lng pair from either a raw "lat, lng" string or a Google Maps URL
 * — the two ways a lister is likely to supply an exact pin. Returns null when
 * nothing usable is found, notably Google short links (maps.app.goo.gl / goo.gl)
 * which need a network redirect to resolve and can't be read client-side.
 */
export function parseLatLng(input: string): LngLat | null {
  const raw = input.trim();
  if (!raw) return null;

  const N = "(-?\\d+(?:\\.\\d+)?)";
  const check = (lat: number, lng: number): LngLat | null =>
    isValidCoord(lat, 90) && isValidCoord(lng, 180) ? { lat, lng } : null;

  // Google Maps place marker: !3d<lat>!4d<lng> — the most precise signal in a URL.
  const marker = raw.match(new RegExp(`!3d${N}!4d${N}`));
  if (marker) return check(parseFloat(marker[1]!), parseFloat(marker[2]!));

  // q= / query= / ll= / center= / sll= parameters carrying "lat,lng".
  const param = raw.match(new RegExp(`[?&](?:q|query|ll|center|sll)=${N},${N}`));
  if (param) return check(parseFloat(param[1]!), parseFloat(param[2]!));

  // @lat,lng viewport centre (…/maps/@19.01,72.81,15z).
  const at = raw.match(new RegExp(`@${N},${N}`));
  if (at) return check(parseFloat(at[1]!), parseFloat(at[2]!));

  // Plain "lat, lng" (Google's right-click "copy coordinates" gives this).
  const pair = raw.match(new RegExp(`^${N}\\s*[,\\s]\\s*${N}$`));
  if (pair) return check(parseFloat(pair[1]!), parseFloat(pair[2]!));

  return null;
}

/** Centre + a rough zoom that fits a set of points. */
export function fitView(points: LngLat[]): { longitude: number; latitude: number; zoom: number } {
  if (points.length === 0) return { longitude: INDIA_CENTROID.lng, latitude: INDIA_CENTROID.lat, zoom: 4 };
  if (points.length === 1) return { longitude: points[0]!.lng, latitude: points[0]!.lat, zoom: 11 };

  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const span = Math.max(maxLng - minLng, maxLat - minLat);

  // crude span → zoom mapping; good enough for a geographic-spread overview
  const zoom = span > 15 ? 4 : span > 8 ? 4.5 : span > 4 ? 5.5 : span > 1 ? 8 : span > 0.2 ? 10 : 12;
  return { longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2, zoom };
}

/**
 * Stable colour palette for categorical map markers (e.g. one colour per sales
 * rep). Returns a hex (for the Mapbox marker) plus Tailwind classes (for
 * legends/badges) so the same colour is used everywhere.
 */
export type MarkerColor = { hex: string; dot: string; chipBg: string; chipText: string };

const MARKER_PALETTE: MarkerColor[] = [
  { hex: "#dc2626", dot: "bg-red-500", chipBg: "bg-red-50", chipText: "text-red-700" },
  { hex: "#2563eb", dot: "bg-blue-600", chipBg: "bg-blue-50", chipText: "text-blue-700" },
  { hex: "#059669", dot: "bg-emerald-600", chipBg: "bg-emerald-50", chipText: "text-emerald-700" },
  { hex: "#d97706", dot: "bg-amber-600", chipBg: "bg-amber-50", chipText: "text-amber-700" },
  { hex: "#7c3aed", dot: "bg-violet-600", chipBg: "bg-violet-50", chipText: "text-violet-700" },
  { hex: "#0891b2", dot: "bg-cyan-600", chipBg: "bg-cyan-50", chipText: "text-cyan-700" },
  { hex: "#db2777", dot: "bg-pink-600", chipBg: "bg-pink-50", chipText: "text-pink-700" },
  { hex: "#65a30d", dot: "bg-lime-600", chipBg: "bg-lime-50", chipText: "text-lime-700" },
];

/** Deterministic colour for a category key (stable across renders). */
export function categoryColor(key: string): MarkerColor {
  const idx = Math.floor(hash01(key) * MARKER_PALETTE.length) % MARKER_PALETTE.length;
  return MARKER_PALETTE[idx]!;
}
