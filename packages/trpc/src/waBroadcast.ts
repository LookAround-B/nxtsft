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
export function audienceWhere(a: Audience): UserWhere {
  const where: UserWhere = { phone: { not: null }, active: true };
  if (a.role) where.role = a.role;
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
