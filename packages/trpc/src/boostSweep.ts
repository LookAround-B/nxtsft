import prisma from "@nxtsft/db";

/**
 * Retire lapsed listing boosts.
 *
 * Search ranks on the denormalised `Property.boostScore`, so nothing notices a
 * boost expiring until someone clears the column. Rather than run a scheduler,
 * we piggyback on the read path: the first search after the interval elapses
 * does one indexed `updateMany`. No cron, no CRON_SECRET, and it self-heals —
 * any traffic at all keeps ranking honest.
 *
 * Correctness never depends on this running. The buyer-facing badge reads
 * `boostExpiry` directly, so a listing can rank a few minutes too high but can
 * never *display* a boost tag it no longer owns.
 *
 * The throttle is per-instance (Fluid Compute reuses instances across requests),
 * so with N warm instances this runs at most N times per interval. That's fine:
 * the predicate is indexed and, once swept, matches zero rows — a cleared boost
 * has `boostExpiry = null`, and `null < now()` is never true.
 */
const SWEEP_INTERVAL_MS = 5 * 60_000;

let lastSweptAt = 0;
let inFlight: Promise<number> | null = null;

export async function sweepExpiredBoosts(opts: { force?: boolean } = {}): Promise<number> {
  const now = Date.now();
  if (!opts.force && now - lastSweptAt < SWEEP_INTERVAL_MS) return 0;

  // Coalesce concurrent callers on the same instance — the DB pool is capped at
  // one connection, so a stampede of identical updateMany calls would serialise
  // behind each other and add latency to every in-flight search.
  if (inFlight) return inFlight;

  lastSweptAt = now; // claim the slot *before* awaiting, so retries don't pile up
  inFlight = prisma.property
    .updateMany({
      where: { boostExpiry: { lt: new Date() } },
      data: { boostTier: null, boostScore: 0, boostExpiry: null },
    })
    .then((r) => r.count)
    .catch(() => {
      // A failed sweep must never fail the search that triggered it. Reset the
      // clock so the next request retries rather than waiting out the interval.
      lastSweptAt = 0;
      return 0;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
