/**
 * ─── Server-side Input Sanitisation & Reusable Zod Schemas ──────────────
 *
 * Every tRPC procedure that accepts user input MUST use the schemas exported
 * here instead of raw `z.string()`.  This single file gates:
 *
 *   • HTML / script-tag stripping  (prevents stored XSS)
 *   • Max-length enforcement       (prevents payload bombs & DB bloat)
 *   • CUID / UUID format guards    (prevents NoSQL / SQL-like injection via IDs)
 *   • Safe URL validation          (prevents SSRF via image URLs)
 *   • Regex-constrained fields     (phone, RERA, zip, IP)
 */

import { z } from "zod";

// ─── Low-level helpers ──────────────────────────────────────────────────

/**
 * Strip HTML tags, null bytes, and control characters from a string.
 * Works server-side without a DOM — just regex-based stripping.
 */
export function stripUnsafe(input: string): string {
  return input
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove HTML entities that could be used for XSS
    .replace(/&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, "")
    // Remove common JS injection patterns
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .trim();
}

/**
 * Validate that a URL is safe (no SSRF to internal networks).
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "metadata.google.internal" ||
      hostname === "169.254.169.254" // AWS/GCP metadata endpoint
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ─── Reusable Zod primitives ────────────────────────────────────────────

/** CUID identifier (Prisma default) */
export const cuidSchema = z
  .string()
  .min(1, "ID is required")
  .max(30, "Invalid ID")
  .regex(/^c[a-z0-9]{8,28}$/, "Invalid ID format");

/** Safe free-text string with HTML stripping, trim, and length cap. */
export function safeString(maxLen: number, minLen = 0) {
  let s = z.string().max(maxLen, `Input exceeds ${maxLen} characters`);
  if (minLen > 0) s = s.min(minLen, `Input must be at least ${minLen} characters`);
  return s.transform((v) => stripUnsafe(v));
}

/** Name field: letters, spaces, hyphens, apostrophes only */
export const nameSchema = safeString(100, 2).pipe(
  z.string().regex(/^[a-zA-Z\s'\-\.]+$/, "Name contains invalid characters"),
);

/** Email: lowercase, trimmed, max 254 chars */
export const emailSchema = z
  .string()
  .max(254)
  .email("Invalid email address")
  .toLowerCase()
  .trim();

/** Indian mobile: 10 digits starting with 6-9 */
export const phoneSchema = z
  .string()
  .max(20)
  .regex(/^[6-9]\d{9}$/, "Invalid 10-digit Indian mobile number")
  .transform((s) => s.replace(/\D/g, ""));

/** Password: length-capped to prevent hash-DOS */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

/** City / state / locality text */
export const geoTextSchema = safeString(100, 1);

/** General search query */
export const searchSchema = safeString(200);

/** Description / notes — larger text field */
export const descriptionSchema = safeString(5000);

/** Short note / feedback */
export const noteSchema = safeString(2000);

/** URL with SSRF protection */
export const safeUrlSchema = z
  .string()
  .url("Invalid URL")
  .max(2048)
  .refine(isSafeUrl, "URL points to a disallowed address");

/** Safe URL array (e.g. property images) */
export const safeUrlArraySchema = z.array(safeUrlSchema).max(20).default([]);

/** RERA registration number */
export const reraSchema = z
  .string()
  .max(50)
  .regex(/^[a-zA-Z0-9\/\-]+$/, "Invalid RERA registration number format");

/** Indian ZIP code */
export const zipCodeSchema = z
  .string()
  .max(6)
  .regex(/^\d{6}$/, "Invalid ZIP code");

/** IP address */
export const ipSchema = z.string().ip();

/** Cursor for pagination — CUID or absent */
export const cursorSchema = z.string().max(30).optional();

/** Pagination limit */
export const limitSchema = z.number().int().min(1).max(100).default(20);

/** Datetime string (ISO 8601) */
export const datetimeSchema = z.string().datetime();

/** Role enum (all platform roles) */
export const roleSchema = z.enum([
  "super-admin",
  "admin",
  "supervisor",
  "sales",
  "support-admin",
  "user",
  "customer",
]);

/** Staff role subset (excludes consumer roles) */
export const staffRoleSchema = z.enum([
  "admin",
  "supervisor",
  "sales",
  "support-admin",
]);

/** Property type enum */
export const propertyTypeSchema = z.enum([
  "Apartment",
  "Villa",
  "Studio",
  "Office",
  "Bungalow",
  "Plot",
  "PG",
]);

/** Purpose enum */
export const purposeSchema = z.enum(["Sale", "Rent"]);

/** Property status enum */
export const propertyStatusSchema = z.enum(["Active", "Sold", "Rented", "Inactive"]);

/** Furnishing enum */
export const furnishingSchema = z.enum(["Furnished", "Semi-Furnished", "Unfurnished"]);

/** Lead status enum */
export const leadStatusSchema = z.enum(["Hot", "Warm", "Cold", "New", "Converted", "Lost"]);

/** Lead source enum */
export const leadSourceSchema = z.enum(["Portal", "WhatsApp", "Referral", "Direct"]);

/** Ticket category enum */
export const ticketCategorySchema = z.enum(["payment", "property", "agent", "technical", "other"]);

/** Ticket priority enum */
export const ticketPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

/** Ticket status enum */
export const ticketStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);

/** Site visit status enum */
export const siteVisitStatusSchema = z.enum(["Scheduled", "Completed", "Cancelled", "Rescheduled"]);

/** Alert frequency enum */
export const alertFrequencySchema = z.enum(["daily", "weekly", "instant"]);

/** Password complexity enum */
export const passwordComplexitySchema = z.enum(["low", "medium", "high"]);

/** Plan type enum */
export const planTypeSchema = z.enum(["seeker", "owner-rent", "owner-sell"]);

/** Safe amenities array: short strings, limited count */
export const amenitiesSchema = z.array(safeString(100)).max(30).default([]);

/** Safe features / highlights array */
export const highlightsSchema = z.array(safeString(500)).max(10).default([]);

/** Safe nearby-places array */
export const nearbyPlacesSchema = z.array(safeString(200)).max(20).default([]);

/** Constrained search-alert filters — explicit allowed keys only */
export const searchAlertFiltersSchema = z
  .object({
    city: z.string().max(100).optional(),
    type: z.string().max(50).optional(),
    purpose: z.string().max(10).optional(),
    minPrice: z.number().int().nonnegative().max(999_999_999_999).optional(),
    maxPrice: z.number().int().nonnegative().max(999_999_999_999).optional(),
    bedrooms: z.number().int().nonnegative().max(20).optional(),
    bhk: z.string().max(20).optional(),
  })
  .strict(); // reject unknown keys

/** Price schema */
export const priceSchema = z.number().int().positive().max(999_999_999_999, "Price is too large");

/** Area schema */
export const areaSchema = z.number().int().positive().max(9_999_999, "Area is too large");

/** Room count (bedrooms, bathrooms, balconies, parking) */
export const roomCountSchema = z.number().int().min(0).max(50).default(0);

/** Rating (1-5) */
export const ratingSchema = z.number().int().min(1).max(5);

/** Latitude */
export const latitudeSchema = z.number().min(-90).max(90).default(0);

/** Longitude */
export const longitudeSchema = z.number().min(-180).max(180).default(0);
