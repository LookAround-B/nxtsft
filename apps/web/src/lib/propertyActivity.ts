// Deterministic sample activity for the explicitly labeled demo section.
// These names and counts are not recorded buyer activity.

import { NAMES_BY_STATE, type DummyName } from "@/data/dummyNames";

export type ActivityAction = "interested" | "wishlisted" | "contact";

// User-listed properties store state as "India" (the /list wizard hardcodes it),
// so the region-name lookup has to fall back to the city. Maps each city the
// listing form offers to the state whose name pool it should draw from.
const CITY_TO_STATE: Record<string, string> = {
  Mumbai: "Maharashtra",
  Pune: "Maharashtra",
  Bengaluru: "Karnataka",
  Bangalore: "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
  "Delhi NCR": "Delhi",
  Delhi: "Delhi",
  Noida: "Uttar Pradesh",
  Gurgaon: "Haryana",
  Gurugram: "Haryana",
  Ahmedabad: "Gujarat",
  Surat: "Gujarat",
  Kolkata: "West Bengal",
  Kochi: "Kerala",
  Jaipur: "Rajasthan",
  Lucknow: "Uttar Pradesh",
  Mangalore: "Karnataka",
  Mangaluru: "Karnataka",
  Warangal: "Telangana",
  Visakhapatnam: "Andhra Pradesh",
  Vishakhapatnam: "Andhra Pradesh",
  Vishakapatnam: "Andhra Pradesh",
  Amaravati: "Andhra Pradesh",
  Haridwar: "Uttarakhand",
};

// Resolve the region-appropriate name pool. Prefer an exact state match; else
// map the city/locality to its state. Do not substitute unrelated regional names.
function namePool(
  state?: string | null,
  city?: string | null,
  locality?: string | null,
): DummyName[] {
  const matchedState = Object.keys(NAMES_BY_STATE).find(
    (name) => name.toLowerCase() === state?.trim().toLowerCase(),
  );
  if (matchedState) return NAMES_BY_STATE[matchedState];
  for (const v of [city, state, locality]) {
    const key = Object.keys(CITY_TO_STATE).find(
      (name) => name.toLowerCase() === v?.trim().toLowerCase(),
    );
    const mapped = key ? CITY_TO_STATE[key] : undefined;
    if (mapped) return NAMES_BY_STATE[mapped] ?? [];
  }
  return [];
}

export interface ActivityEvent {
  name: string;
  gender: "m" | "f";
  action: ActivityAction;
  at: string; // ISO timestamp
}

export interface PropertyActivity {
  counts: { views: number; watching: number; shortlists: number; contacted: number };
  recent: ActivityEvent[];
  trending: boolean;
}

// FNV-1a string hash → uint32. Cheap, deterministic, good enough for seeding.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic [0,1) stream from a uint32 seed.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86_400_000;

// Calendar day index (UTC). Used both as the daily seed and to count age.
function dayNumber(d: Date): number {
  return Math.floor(d.getTime() / DAY_MS);
}

/**
 * Build the fabricated activity for one property. Deterministic for a given
 * (propertyId, calendar day) pair. Shown from the moment a listing goes live —
 * event timestamps are clamped to the listing's own age so nothing predates it.
 */
export function propertyActivity(
  propertyId: string,
  createdAt: Date,
  region?: { state?: string | null; city?: string | null; locality?: string | null } | null,
  now: Date = new Date(),
  freeListing = true,
): PropertyActivity {
  // Region-appropriate buyer names (Hyderabad listing → Telangana names, etc.).
  const names: DummyName[] = namePool(region?.state, region?.city, region?.locality);

  const today = dayNumber(now);
  // Simulated views grow by completed hours since listing creation.
  const base = rng(hash(propertyId));
  const ageHours = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 3_600_000));
  const views = ageHours * (freeListing ? 1 : 2);
  const watching = Math.floor(views * 0.03);
  // Realistic conversion ratios: ~1.5% shortlist, ~6% contacted.
  const shortlists = Math.round(views * (0.012 + base() * 0.013));
  const contacted = Math.round(views * (0.04 + base() * 0.04));

  // Rotating buyer feed: pick a handful of names from the dataset, seeded by the
  // day so it reshuffles every 24h but stays stable within the day.
  const feedRng = rng(hash(`${propertyId}:feed:${today}`));
  const count = Math.min(names.length, 5 + Math.floor(feedRng() * 4)); // 5–8 entries
  const used = new Set<number>();
  const actions: ActivityAction[] = ["interested", "wishlisted", "contact"];
  const recent: ActivityEvent[] = [];

  // Events spread over the last ~3 days, but never further back than the
  // listing itself exists — a 4h-old listing gets 4h worth of activity.
  const ageMinutes = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / 60_000));
  const spanMinutes = Math.min(3 * 24 * 60, ageMinutes);

  for (let i = 0; i < count; i++) {
    let idx = Math.floor(feedRng() * names.length);
    // linear-probe to avoid duplicate names in the same feed
    while (used.has(idx)) idx = (idx + 1) % names.length;
    used.add(idx);
    const person = names[idx]!;
    const action = actions[Math.floor(feedRng() * actions.length)]!;
    const minutesAgo = Math.min(ageMinutes, Math.floor(feedRng() * spanMinutes) + i * 7);
    recent.push({
      name: person.n,
      gender: person.g,
      action,
      at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    });
  }
  recent.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    counts: { views, watching, shortlists, contacted },
    recent,
    trending: views >= 100,
  };
}
