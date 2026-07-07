"use client";
import { useEffect, useState } from "react";

// GOL-292: footer "Visitors Today" ticker. Purely presentational — the number
// is a deterministic curve, not real traffic (real tracking = Vercel Analytics
// + PostHog). Seeded by IST calendar day so every client shows the same value:
//   • daily target: 20k–30k, picked from the day seed
//   • resets to 0 at midnight IST
//   • 80% of the day's count accrues 7:00–23:00, 20% overnight
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Deterministic PRNG — same seed (IST day) must yield the same target on
// every client, so Math.random() is out.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cumulative share of the daily target at `minute` (0–1440, IST).
// Overnight 20% splits by duration: 00:00–07:00 → 17.5%, 23:00–24:00 → 2.5%.
function cumulativeShare(minute: number): number {
  if (minute < 420) return 0.175 * (minute / 420);
  if (minute < 1380) return 0.175 + 0.8 * ((minute - 420) / 960);
  return 0.975 + 0.025 * ((minute - 1380) / 60);
}

export function visitorsNow(now = new Date()): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const daySeed = ist.getUTCFullYear() * 10000 + (ist.getUTCMonth() + 1) * 100 + ist.getUTCDate();
  const target = 20000 + Math.floor(mulberry32(daySeed)() * 10001); // 20k–30k
  const minuteOfDay =
    ist.getUTCHours() * 60 + ist.getUTCMinutes() + ist.getUTCSeconds() / 60;
  return Math.floor(target * cumulativeShare(minuteOfDay));
}

export function DailyVisitorsCount() {
  // null until mounted — the value is time-dependent, so rendering it on the
  // server would hydration-mismatch.
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setCount(visitorsNow());
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  const digits = String(count ?? 0).padStart(6, "0").split("");

  return (
    <div className="inline-flex flex-col items-center gap-1.5 rounded-lg bg-primary/90 px-4 py-2.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-navy">
        Daily Visitors Count
      </span>
      <div className="flex gap-1" aria-label={count === null ? "Loading" : `${count} visitors today`}>
        {digits.map((d, i) => (
          <span
            key={i}
            className="flex h-7 w-5 items-center justify-center rounded-sm bg-navy font-mono text-sm font-bold text-white tabular-nums"
          >
            {count === null ? "·" : d}
          </span>
        ))}
      </div>
    </div>
  );
}
