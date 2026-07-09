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
