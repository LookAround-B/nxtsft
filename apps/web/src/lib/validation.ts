import { z } from "zod";

// Strict input length limits
const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 20 },
  password: { min: 8, max: 128 },
  city: { max: 100 },
  locality: { max: 200 },
  title: { max: 500 },
  description: { max: 5000 },
  rera: { max: 50 },
  price: { max: 999999999999 },
  area: { max: 9999999 },
  bedrooms: { max: 20 },
  url: { max: 2048 },
  search: { max: 200 },
};

// Strip all HTML tags (no tags allowed — equivalent to DOMPurify with ALLOWED_TAGS:[])
function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// Sanitize for database text fields
function sanitizeText(input: string): string {
  return sanitizeHtml(input).trim();
}

// Validate and sanitize name
export const nameSchema = z
  .string()
  .min(LIMITS.name.min, "Name must be at least 2 characters")
  .max(LIMITS.name.max, `Name cannot exceed ${LIMITS.name.max} characters`)
  .transform((s) => sanitizeText(s))
  .refine(
    (s) => /^[a-zA-Z\s'-]+$/.test(s),
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  );

// Validate email - strict RFC-compliant pattern
export const emailSchema = z
  .string()
  .max(LIMITS.email.max)
  .email("Invalid email address")
  .toLowerCase()
  .trim();

// Validate phone - Indian format
export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Invalid phone number")
  .transform((s) => s.replace(/\D/g, ""));

// Validate password - enforces complexity
export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, "Password must be at least 8 characters")
  .max(LIMITS.password.max, "Password is too long")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

// Validate city
export const citySchema = z
  .string()
  .max(LIMITS.city.max)
  .transform((s) => sanitizeText(s))
  .refine((s) => s.length > 0, "City is required");

// Validate locality
export const localitySchema = z
  .string()
  .max(LIMITS.locality.max)
  .transform((s) => sanitizeText(s));

// Validate title
export const titleSchema = z
  .string()
  .max(LIMITS.title.max, `Title cannot exceed ${LIMITS.title.max} characters`)
  .transform((s) => sanitizeText(s))
  .refine((s) => s.length > 0, "Title is required");

// Validate description
export const descriptionSchema = z
  .string()
  .max(LIMITS.description.max, `Description cannot exceed ${LIMITS.description.max} characters`)
  .transform((s) => sanitizeText(s))
  .refine((s) => s.length > 0, "Description is required");

// Validate RERA number - format: MH/2024/000123
export const reraSchema = z
  .string()
  .max(LIMITS.rera.max)
  .regex(
    /^[A-Z]{2}\/\d{4}\/\d{6}$/,
    "Invalid RERA format (expected: MH/2024/000123)"
  );

// Validate price
export const priceSchema = z
  .number()
  .int("Price must be a whole number")
  .positive("Price must be positive")
  .max(LIMITS.price.max, "Price is too large");

// Validate area
export const areaSchema = z
  .number()
  .int("Area must be a whole number")
  .positive("Area must be positive")
  .max(LIMITS.area.max, "Area is too large");

// Validate bedrooms
export const bedroomsSchema = z
  .number()
  .int()
  .nonnegative()
  .max(LIMITS.bedrooms.max);

// Validate property type
export const propertyTypeSchema = z.enum(
  ["Apartment", "Villa", "Studio", "Office", "Bungalow", "Plot", "PG"],
  { message: "Invalid property type" }
);

// Validate purpose (Sale/Rent)
export const purposeSchema = z.enum(["Sale", "Rent"], { message: "Purpose must be Sale or Rent" });

// Validate search query
export const searchSchema = z
  .string()
  .max(LIMITS.search.max)
  .transform((s) => sanitizeText(s));

// Registration schema
export const registrationSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  city: citySchema,
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().max(LIMITS.password.max),
});

// Profile update schema
export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});

// List property schema - Step 4 contact info
export const listerSchema = z.object({
  listerName: nameSchema,
  listerEmail: emailSchema,
  listerPhone: phoneSchema,
});

// Create property schema
export const createPropertySchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  type: propertyTypeSchema,
  purpose: purposeSchema,
  price: priceSchema,
  area: areaSchema,
  bedrooms: bedroomsSchema.optional(),
  bathrooms: bedroomsSchema.default(0),
  balconies: bedroomsSchema.default(0),
  parking: bedroomsSchema.default(0),
  city: citySchema,
  state: z.string().max(100).transform((s) => sanitizeText(s)),
  locality: localitySchema,
  address: z.string().max(500).transform((s) => sanitizeText(s)).optional(),
  zipCode: z.string().regex(/^\d{6}$/, "Invalid ZIP code").optional(),
  latitude: z.number().min(-90).max(90).default(0),
  longitude: z.number().min(-180).max(180).default(0),
  amenities: z.array(z.string().max(100)).max(20).default([]),
  images: z.array(z.string().url().max(LIMITS.url.max)).max(10).default([]),
  rera: reraSchema,
});

// Entity IDs are Prisma cuid()s, not UUIDs (LA-294). Mirrors the cuid regex
// used server-side in @nxtsft/trpc sanitize.ts and the REST v1 route guards.
const cuidIdSchema = z
  .string()
  .regex(/^c[a-z0-9]{8,28}$/, "Invalid property ID");

// Create lead schema
export const createLeadSchema = z.object({
  propertyId: cuidIdSchema,
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  city: citySchema.optional(),
  interest: z.string().max(500).transform((s) => sanitizeText(s)).optional(),
  notes: z.string().max(1000).transform((s) => sanitizeText(s)).optional(),
  source: z.enum(["Portal", "WhatsApp", "Referral", "Direct"]).default("Portal"),
});

// Query parameter validators
export const queryParamsSchema = z.object({
  city: citySchema.optional(),
  type: z.string().max(50).optional(),
  purpose: purposeSchema.optional(),
  bedrooms: bedroomsSchema.optional(),
  minPrice: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .refine((v) => !v || v <= LIMITS.price.max, "Invalid price"),
  maxPrice: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .refine((v) => !v || v <= LIMITS.price.max, "Invalid price"),
  search: searchSchema.optional(),
});

// Builder import row schema
// Bulk-import row. Contract: only Project Name (companyName) is required —
// matches the server `builderRow` schema and the "Only Project Name is required"
// UI text. Mobile/city are optional; a mobile is normalised to digits (kept only
// if it's a valid 10-digit Indian number, else dropped) rather than rejecting the row.
export const builderRowSchema = z.object({
  companyName: z.string().max(200).transform((s) => sanitizeText(s)).refine((s) => s.length > 0, "Project Name is required"),
  ownerName: z.string().max(200).transform((s) => sanitizeText(s)).optional(),
  mobile: z
    .string()
    .max(40)
    .transform((s) => {
      const digits = s.replace(/\D/g, "");
      return /^[6-9]\d{9}$/.test(digits) ? digits : "";
    })
    .optional()
    .default(""),
  projectType: z.string().max(100).transform((s) => sanitizeText(s)).optional(),
  developmentStatus: z.string().max(100).transform((s) => sanitizeText(s)).optional(),
  state: z.string().max(100).transform((s) => sanitizeText(s)).optional(),
  district: z.string().max(100).transform((s) => sanitizeText(s)).optional(),
  city: z.string().max(LIMITS.city.max).transform((s) => sanitizeText(s)).optional().default(""),
});

// Create listing schema
export const createListingSchema = z.object({
  propertyId: cuidIdSchema,
  description: descriptionSchema.optional(),
  highlights: z.array(z.string().max(500)).max(10).default([]),
  active: z.boolean().default(true),
  promoted: z.boolean().default(false),
});

// Type exports for use in components
export type Registration = z.infer<typeof registrationSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type CreateProperty = z.infer<typeof createPropertySchema>;
export type CreateLead = z.infer<typeof createLeadSchema>;
