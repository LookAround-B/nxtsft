// Shared helpers for WhatsApp broadcasts (admin campaign sender). Used by the
// campaigns router (audience preview + launch) and the send-campaigns cron.
import { z } from "zod";
import prisma from "@nxtsft/db";
import { roleSchema, geoTextSchema } from "./sanitize";

type UserWhere = NonNullable<NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"]>;

/** Audience segment filters for a broadcast. All optional — omitted = no filter. */
export const audienceSchema = z.object({
  role: roleSchema.optional(),
  city: geoTextSchema.optional(),
  phoneVerified: z.boolean().optional(),
  // true = only users who opted in to WhatsApp updates at signup (waOptIn).
  waOptIn: z.boolean().optional(),
});
export type Audience = z.infer<typeof audienceSchema>;

/**
 * Prisma `where` for an audience. Always restricted to reachable, active
 * accounts (a phone is required, since WhatsApp needs a number).
 */
// Staff never receive customer broadcasts.
const STAFF_ROLES = ["admin", "super-admin", "support-admin", "supervisor", "sales", "virtual-rep"];

// Real users only (boss 09-28): leave out seed / demo / test accounts — the 06-16
// seed agents (@nxtsft.com, 98200000xx), @example.com demo & test logins,
// 9000000xxx test numbers and names like "dummy" / "tester" / "test".
// (Dummy buyers live in the separate DummyBuyer table and were never included.)
const NOT_DUMMY: UserWhere[] = [
  { NOT: { email: { endsWith: "@example.com", mode: "insensitive" } } },
  { NOT: { email: { endsWith: "@nxtsft.com", mode: "insensitive" } } },
  { NOT: { phone: { startsWith: "98200000" } } },
  { NOT: { phone: { startsWith: "9000000" } } },
  { NOT: { name: { contains: "dummy", mode: "insensitive" } } },
  { NOT: { name: { contains: "tester", mode: "insensitive" } } },
  { NOT: { name: { startsWith: "pwtest", mode: "insensitive" } } },
  { NOT: { name: { equals: "test", mode: "insensitive" } } },
];

export function audienceWhere(a: Audience): UserWhere {
  const where: UserWhere = {
    phone: { not: null },
    active: true,
    role: a.role ? { in: [a.role], notIn: STAFF_ROLES } : { notIn: STAFF_ROLES },
    AND: NOT_DUMMY,
  };
  if (a.city) where.city = { contains: a.city, mode: "insensitive" };
  if (a.phoneVerified !== undefined) where.phoneVerified = a.phoneVerified;
  if (a.waOptIn) where.metadata = { path: ["waOptIn"], equals: true };
  return where;
}

/**
 * Substitute per-recipient tokens in each template param.
 * Supported: {name}, {firstName}, {city}. Anything else stays literal.
 */
export function substituteParams(params: string[], user: { name: string; city: string }): string[] {
  const firstName = user.name.split(" ")[0] || user.name;
  return params.map((p) =>
    p
      .replace(/\{firstName\}/gi, firstName)
      .replace(/\{name\}/gi, user.name)
      .replace(/\{city\}/gi, user.city || ""),
  );
}
