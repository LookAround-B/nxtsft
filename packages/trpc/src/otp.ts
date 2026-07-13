import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

// ─── Signup phone-OTP store ──────────────────────────────────────────────────
//
// Backs the WhatsApp-only signup verification. OTPs live in Upstash Redis with a
// short TTL so they auto-expire with no cleanup job. When Redis isn't configured
// (local dev), falls back to an in-process Map — fine for a single dev instance,
// never used in production (Vercel always has Redis; OTP is env-gated on top).

const OTP_TTL_SECONDS = 5 * 60;      // code valid for 5 minutes
const MAX_ATTEMPTS = 5;              // wrong guesses before the code is burned
const KEY_PREFIX = "nxtsft:signup_otp:";

/** Master switch — OTP is only enforced once an approved template name is set. */
export function isSignupOtpEnabled(): boolean {
  return Boolean(process.env.BHASHSMS_TEMPLATE_SIGNUP_OTP);
}

interface OtpRecord {
  hash: string;
  attempts: number;
  expiresAt: number; // epoch ms
}

let redis: Redis | null = null;
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis ??= new Redis({ url, token });
  return redis;
}

// Dev-only fallback when Redis isn't configured.
const memStore = new Map<string, OtpRecord>();

function hashCode(phone: string, code: string): string {
  // Phone-scoped so an OTP is only ever valid for the number it was sent to.
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function readRecord(phone: string): Promise<OtpRecord | null> {
  const r = getRedis();
  if (r) return (await r.get<OtpRecord>(KEY_PREFIX + phone)) ?? null;
  return memStore.get(phone) ?? null;
}

async function writeRecord(phone: string, rec: OtpRecord, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.set(KEY_PREFIX + phone, rec, { ex: Math.max(1, ttlSeconds) });
    return;
  }
  memStore.set(phone, rec);
}

async function deleteRecord(phone: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(KEY_PREFIX + phone);
    return;
  }
  memStore.delete(phone);
}

/** Generate a 6-digit code (cryptographically random, leading zeros preserved). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Store a freshly generated OTP for a phone, replacing any prior one. */
export async function storeOtp(phone: string, code: string): Promise<void> {
  await writeRecord(
    phone,
    { hash: hashCode(phone, code), attempts: 0, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 },
    OTP_TTL_SECONDS,
  );
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "too_many_attempts" | "mismatch" };

/**
 * Verify a submitted code against the stored OTP. One-time use: a correct code
 * is deleted immediately, and attempts are capped so a code can't be brute-forced.
 */
export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
  const rec = await readRecord(phone);
  if (!rec || Date.now() > rec.expiresAt) {
    await deleteRecord(phone);
    return { ok: false, reason: "expired" };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await deleteRecord(phone);
    return { ok: false, reason: "too_many_attempts" };
  }
  if (constantTimeEqual(rec.hash, hashCode(phone, code))) {
    await deleteRecord(phone);
    return { ok: true };
  }
  const remainingTtl = Math.ceil((rec.expiresAt - Date.now()) / 1000);
  await writeRecord(phone, { ...rec, attempts: rec.attempts + 1 }, remainingTtl);
  return { ok: false, reason: "mismatch" };
}
