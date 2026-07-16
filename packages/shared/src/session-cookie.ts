import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Signs the `nxtsft_session` cookie value (token|role) so the Edge/Node
// middleware page-gate can trust the role without a DB round-trip on every
// navigation, and so the cookie can't be forged client-side (it's httpOnly —
// this signature also protects against a raw value being pasted in via
// devtools or an unrelated cookie-injection bug). GOL-268 H2 + M1.
//
// This is a lightweight, dependency-free module (only node:crypto) so it's
// safe to import from Next.js Middleware (which runs with `runtime: "nodejs"`
// in this app — see apps/web/src/middleware.ts) as well as regular server code.

function getSecret(): string {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_COOKIE_SECRET is not set — required to sign/verify the session cookie.",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Build the signed cookie value to set after a successful login. */
export function signSessionCookie(token: string, role: string): string {
  const payload = `${token}|${role}`;
  return `${payload}|${sign(payload)}`;
}

/**
 * Verify + parse a cookie value. Returns null for anything missing, malformed,
 * or tampered with — callers must treat that identically to "no session".
 */
export function verifySessionCookie(
  value: string | undefined | null,
): { token: string; role: string } | null {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 3) return null;
  const [token, role, signature] = parts;
  if (!token || !role || !signature) return null;

  let expected: string;
  try {
    expected = sign(`${token}|${role}`);
  } catch {
    return null;
  }

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { token, role };
}

export const SESSION_COOKIE_NAME = "nxtsft_session";

// Single source of truth for session lifetime — shared by the cookie's
// maxAge (browser) and Session.expiresAt (DB), which both get renewed on
// activity (see the rolling-renewal comments in middleware.ts and
// server.ts's createContextFromToken) so an active user's session survives
// indefinitely; only this many days of total inactivity logs them out.
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

/** Cookie options shared by every Set-Cookie for the session cookie. */
export function sessionCookieOptions(maxAge: number = SESSION_COOKIE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Session.token is stored as sha256(rawToken), never the raw value (GOL-268
 * L2) — a DB compromise or backup leak no longer hands out live, directly
 * usable session tokens. The raw token (generated once at login, returned to
 * the client) is hashed on write (auth.ts's session creates) and on every
 * read (server.ts's token→session lookup, auth.ts's logout delete). sha256
 * is fine here (not a password — it's already a 256-bit random token with no
 * guessable structure to brute-force).
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
