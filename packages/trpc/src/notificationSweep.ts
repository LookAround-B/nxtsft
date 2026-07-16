import prisma from "@nxtsft/db";

/**
 * Erase notifications 24h after they were marked read.
 *
 * Same lazy-sweep shape as boostSweep.ts: piggyback on the read path instead of
 * running a scheduler. The first notifications.list call after the interval
 * elapses does one indexed `deleteMany`. Correctness never depends on this
 * running — a stale read notification just lingers a few minutes longer.
 */
const SWEEP_INTERVAL_MS = 5 * 60_000;
const READ_TTL_MS = 24 * 60 * 60_000;

let lastSweptAt = 0;
let inFlight: Promise<number> | null = null;

export async function sweepExpiredReadNotifications(opts: { force?: boolean } = {}): Promise<number> {
  const now = Date.now();
  if (!opts.force && now - lastSweptAt < SWEEP_INTERVAL_MS) return 0;

  if (inFlight) return inFlight;

  lastSweptAt = now;
  inFlight = prisma.notification
    .deleteMany({
      where: { read: true, readAt: { lt: new Date(now - READ_TTL_MS) } },
    })
    .then((r) => r.count)
    .catch(() => {
      lastSweptAt = 0;
      return 0;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
