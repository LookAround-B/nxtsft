import prisma from "@nxtsft/db";

/**
 * Lazy, deterministic assignment of sample-interest identities to free listings.
 *
 * Unlike boostSweep.ts this needs no time-window throttle or in-flight
 * coalescing: the 5 picks for a given property are a pure function of its id
 * plus the current active DummyBuyer pool, so any number of concurrent
 * callers compute identical picks and race harmlessly into
 * `createMany({ skipDuplicates: true })`. It only ever needs to run once per
 * property, not on a schedule.
 *
 * Callers decide who gets samples — this function has no entitlement or
 * status check of its own. See the `dummyLeads` resolver in
 * sellerInsights.ts: free sellers always, paid sellers while the
 * `leads.samples_for_paid_sellers` switch is on, Active listings only.
 *
 * Requires a seeded, active `DummyBuyer` pool (`prisma/seed-dummy-buyers.ts`
 * in packages/db). With an empty pool this silently no-ops and no sample
 * card can ever appear.
 */

const DUMMY_LEADS_PER_PROPERTY = 5;

const SAMPLE_REQUEST_TYPES = [
  "Site visit interest",
  "Property details interest",
  "Price discussion interest",
] as const;

const SAMPLE_AGES = ["2h ago", "10h ago", "1d ago", "2d ago", "3d ago"] as const;

// Presentation-only activity chips for the seller-facing sample cards. These
// are deterministic per assignment, not a real presence signal — there is no
// live buyer behind a DummyBuyer row. Kept as a fixed set so the "online now"
// framing the product asked for stays visually consistent across cards.
const SAMPLE_ACTIVITY = [
  { tone: "online" as const, headline: "ONLINE", detail: "Active now" },
  { tone: "offline" as const, headline: "OFFLINE", detail: "Last active 1hr ago" },
  { tone: "requested" as const, headline: "REQUESTED", detail: "2hrs ago" },
  { tone: "requested" as const, headline: "REQUESTED", detail: "10hrs ago" },
  { tone: "requested" as const, headline: "REQUESTED", detail: "15hrs ago" },
] as const;

// FNV-1a string hash -> uint32. Same algorithm as
// apps/web/src/lib/propertyActivity.ts, reimplemented here because
// packages/trpc cannot depend on apps/web (wrong dependency direction).
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic [0,1) stream from a uint32 seed. Same
// algorithm as propertyActivity.ts.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Small city->state fallback, matching the listing form's city list. Same
// short table as propertyActivity.ts's CITY_TO_STATE, duplicated here for
// the same cross-package reason as the hash/rng functions above. Hoisting
// this into packages/shared (which both apps/web and packages/trpc already
// depend on) is a reasonable follow-up, kept out of this change's diff.
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

function resolveState(city?: string | null, state?: string | null): string | undefined {
  if (state?.trim()) return state.trim();
  const key = city
    ? Object.keys(CITY_TO_STATE).find((k) => k.toLowerCase() === city.trim().toLowerCase())
    : undefined;
  return key ? CITY_TO_STATE[key] : undefined;
}

type PropertyInput = {
  id: string;
  sellerId: string;
  location: { city: string; state: string } | null;
};

export async function ensureDummyLeadsAssigned(properties: PropertyInput[]): Promise<void> {
  if (!properties.length) return;

  const propertyIds = properties.map((p) => p.id);
  const existing = await prisma.dummyLeadAssignment.groupBy({
    by: ["propertyId"],
    where: { propertyId: { in: propertyIds } },
  });
  const alreadySeeded = new Set(existing.map((e) => e.propertyId));
  const unseeded = properties.filter((p) => !alreadySeeded.has(p.id));
  if (!unseeded.length) return;

  const pool = await prisma.dummyBuyer.findMany({
    where: { active: true },
    select: { id: true, state: true },
  });
  if (!pool.length) return;

  const byState = new Map<string, string[]>();
  for (const b of pool) {
    if (!b.state) continue;
    const list = byState.get(b.state) ?? [];
    list.push(b.id);
    byState.set(b.state, list);
  }
  const allIds = pool.map((b) => b.id);

  const data: { propertyId: string; sellerId: string; dummyBuyerId: string }[] = [];
  for (const property of unseeded) {
    const state = resolveState(property.location?.city, property.location?.state);
    const regional = (state && byState.get(state)) || [];
    const picks = pickDeterministic(property.id, regional, allIds, DUMMY_LEADS_PER_PROPERTY);
    for (const dummyBuyerId of picks) {
      data.push({ propertyId: property.id, sellerId: property.sellerId, dummyBuyerId });
    }
  }
  if (!data.length) return;

  await prisma.dummyLeadAssignment.createMany({ data, skipDuplicates: true });
}

// Deterministically pick `count` ids for a property: region-matched first,
// topped up from the full pool if the region has too few. Seeded by
// propertyId so repeated/concurrent calls always compute the same picks.
function pickDeterministic(
  propertyId: string,
  regionalIds: string[],
  allIds: string[],
  count: number,
): string[] {
  const draw = rng(hash(propertyId));
  const ordered = [...new Set([...shuffle(regionalIds, draw), ...shuffle(allIds, draw)])];
  return ordered.slice(0, Math.min(count, ordered.length));
}

function shuffle<T>(arr: T[], draw: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Presentation metadata for a transparent sample-interest card. These values
 * are deterministic previews, not buyer-provided details or timestamps.
 */
export function sampleInterestPreview(assignmentId: string, propertyPrice: bigint) {
  const draw = rng(hash(`${assignmentId}:sample-preview`));
  const percentage = [82, 86, 89, 93, 97][Math.floor(draw() * 5)]!;
  const budget = (propertyPrice * BigInt(percentage)) / 100n;
  return {
    requestType: SAMPLE_REQUEST_TYPES[Math.floor(draw() * SAMPLE_REQUEST_TYPES.length)]!,
    relativeTime: SAMPLE_AGES[Math.floor(draw() * SAMPLE_AGES.length)]!,
    activity: SAMPLE_ACTIVITY[Math.floor(draw() * SAMPLE_ACTIVITY.length)]!,
    budget: formatIndianAmount(budget),
  };
}

function formatIndianAmount(amount: bigint): string {
  const crore = 10_000_000n;
  const lakh = 100_000n;
  if (amount >= crore) return `₹${formatOneDecimal(amount, crore)}Cr`;
  if (amount >= lakh) return `₹${formatOneDecimal(amount, lakh)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatOneDecimal(amount: bigint, divisor: bigint): string {
  const tenths = (amount * 10n) / divisor;
  const whole = tenths / 10n;
  const fraction = tenths % 10n;
  return fraction === 0n ? whole.toString() : `${whole}.${fraction}`;
}
