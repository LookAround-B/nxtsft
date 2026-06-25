// Deterministic, fabricated "social proof" activity for a property listing (GOL-123).
//
// The client wanted realistic-looking engagement numbers that change every day,
// plus a rotating feed of buyer names. There is no real per-property tracking
// behind this — everything is derived purely from the property id + the current
// date, so it is:
//   • stable within a single day (same numbers on every render / every visitor),
//   • monotonically trending up as the listing ages (never looks "dead"),
//   • rotated daily (the name feed reshuffles each calendar day).
//
// Only shown on Active listings (the caller gates on status). "Dummy"/non-active
// listings get nothing — see PropertyEngagement.

import { DUMMY_NAMES } from "@/data/dummyNames";

export type ActivityAction = "interested" | "wishlisted" | "contact";

export interface ActivityEvent {
  name: string;
  gender: "m" | "f";
  action: ActivityAction;
  at: string; // ISO timestamp
}

export interface PropertyActivity {
  counts: { views: number; shortlists: number; contacted: number };
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
 * (propertyId, calendar day) pair.
 */
export function propertyActivity(propertyId: string, createdAt: Date, now: Date = new Date()): PropertyActivity {
  const today = dayNumber(now);
  const born = dayNumber(createdAt);
  const ageDays = Math.max(1, today - born);

  // Per-property "personality": a steady views/day rate, fixed for the listing.
  const base = rng(hash(propertyId));
  const viewsPerDay = 6 + Math.floor(base() * 13); // 6–18 views/day

  // Daily jitter — keeps the number moving day to day without dropping the trend.
  const day = rng(hash(`${propertyId}:${today}`));
  const jitter = Math.floor(day() * viewsPerDay);

  const views = ageDays * viewsPerDay + jitter;
  // Realistic conversion ratios: ~1.5% shortlist, ~6% contacted.
  const shortlists = Math.max(1, Math.round(views * (0.012 + base() * 0.013)));
  const contacted = Math.max(1, Math.round(views * (0.04 + base() * 0.04)));

  // Rotating buyer feed: pick a handful of names from the dataset, seeded by the
  // day so it reshuffles every 24h but stays stable within the day.
  const feedRng = rng(hash(`${propertyId}:feed:${today}`));
  const count = 5 + Math.floor(feedRng() * 4); // 5–8 entries
  const used = new Set<number>();
  const actions: ActivityAction[] = ["interested", "wishlisted", "contact"];
  const recent: ActivityEvent[] = [];

  for (let i = 0; i < count; i++) {
    let idx = Math.floor(feedRng() * DUMMY_NAMES.length);
    // linear-probe to avoid duplicate names in the same feed
    while (used.has(idx)) idx = (idx + 1) % DUMMY_NAMES.length;
    used.add(idx);
    const person = DUMMY_NAMES[idx]!;
    const action = actions[Math.floor(feedRng() * actions.length)]!;
    // Spread events across the last ~3 days, newest first.
    const minutesAgo = Math.floor(feedRng() * 3 * 24 * 60) + i * 7;
    recent.push({
      name: person.n,
      gender: person.g,
      action,
      at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    });
  }
  recent.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    counts: { views, shortlists, contacted },
    recent,
    trending: viewsPerDay >= 12,
  };
}
