// Resolves the real client IP from an `X-Forwarded-For` header without
// blindly trusting the first (leftmost) entry — that entry is whatever the
// connecting client claims, so a request sent directly to the origin (or
// through a chain longer than expected) can forge it and dodge per-IP rate
// limiting entirely (GOL-268 L5).
//
// Each hop *appends* its peer's address, so counting from the RIGHT by the
// number of proxies we actually trust gives the address our own trusted edge
// observed — anything to the left of that could be attacker-supplied.
// Set TRUSTED_PROXY_COUNT to the number of reverse proxies in front of this
// app (default 1 — this app runs behind exactly one hop: Vercel's edge
// network for apps/web).

const TRUSTED_PROXY_COUNT = Math.max(0, parseInt(process.env.TRUSTED_PROXY_COUNT ?? "1", 10) || 1);

export function trustedClientIp(
  forwardedFor: string | null | undefined,
  fallback: string | null = null,
): string | null {
  if (!forwardedFor) return fallback;
  const hops = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
  if (hops.length === 0) return fallback;

  const idx = hops.length - TRUSTED_PROXY_COUNT;
  // Fewer hops than the configured trusted-proxy count means this request
  // didn't come through as many proxies as expected — don't guess, fall back.
  if (idx < 0) return fallback;
  return hops[idx] ?? fallback;
}
