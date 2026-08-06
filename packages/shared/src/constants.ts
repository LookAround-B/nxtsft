export const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  SALES: "sales",
  SUPPORT_ADMIN: "support-admin",
  USER: "user",
  HOME_SELLER: "home-seller",
} as const;

export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Plot",
  "Commercial",
  "PG",
  "New",
  "Studio",
] as const;

export const CITIES = [
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
] as const;

export const CACHE_KEYS = {
  PROPERTY_LIST: "properties:",
  PROPERTY_DETAIL: "property:",
  AGENT_LIST: "agents:",
  SEARCH_RESULTS: "search:",
  USER_SESSION: "session:",
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

export const BULK_IMPORT_MAX_ROWS = 1000;

export const RATE_LIMITS = {
  SEARCH: { points: 1, duration: "1 minute" },
  CONTACT_AGENT: { points: 5, duration: "1 hour" },
  API_GENERAL: { points: 100, duration: "1 hour" },
} as const;

/**
 * Paid listing boosts. `score` is denormalised onto Property.boostScore so
 * Postgres can sort on an indexed integer; `tag` is what a buyer sees on the
 * card. Gold additionally qualifies a listing for the home page.
 */
/**
 * Property.status for a rep's dummy (test) listing. No public read asks for it
 * — search, feeds, the sitemap and the public REST API all filter
 * `status: "Active"` — so a Test listing is invisible to buyers while staying
 * reachable by direct URL for the rep who made it.
 */
export const TEST_LISTING_STATUS = "Test";

export const BOOST_TIERS = {
  bronze: { score: 40, tag: "Boosted" },
  silver: { score: 70, tag: "Top Pick" },
  gold: { score: 100, tag: "Featured" },
} as const;

export type BoostTier = keyof typeof BOOST_TIERS;

export const BOOST_TIER_NAMES = Object.keys(BOOST_TIERS) as BoostTier[];

export function isBoostTier(v: unknown): v is BoostTier {
  return typeof v === "string" && v in BOOST_TIERS;
}

/** A boost only counts while it has not lapsed. */
export function boostIsActive(tier: string | null, expiry: Date | string | null): boolean {
  if (!tier || !expiry) return false;
  return new Date(expiry).getTime() > Date.now();
}

/**
 * Name of the non-httpOnly companion cookie set alongside the real session
 * cookie. It carries no secret — it only says "a session cookie exists for
 * this browser", which is the one thing client JS cannot otherwise learn
 * (the session token is httpOnly by design, GOL-268 H2). Lives here rather
 * than in session-cookie.ts so client components can import it without
 * dragging node:crypto into the browser bundle. See authMarkerCookieOptions.
 */
export const AUTH_MARKER_COOKIE_NAME = "nxtsft_auth";
