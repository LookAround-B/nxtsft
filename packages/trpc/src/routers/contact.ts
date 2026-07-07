import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, staffProcedure, contactRateLimit } from "../server";
import {
  nameSchema,
  emailSchema,
  geoTextSchema,
  safeString,
  enquiryStatusSchema,
  cursorSchema,
  limitSchema,
} from "../sanitize";

// Public contact form accepts looser phone input than the strict Indian-mobile
// schema (people paste "+91 98765 43210", country codes, etc.). Keep it simple:
// length-capped, stripped of unsafe chars, optional.
const contactPhoneSchema = safeString(20, 1).optional();

// GOL-291: fixed opt-out reason lists — free text only via the capped "Other" field.
const UNSUB_REASONS = [
  "Not interested anymore",
  "Don't remember signing up",
  "Getting messages too often",
  "Broken email design",
  "Irrelevant content",
  "Other",
] as const;

export const contactRouter = router({
  // Public: anyone can submit a contact-form enquiry. Rate-limited (5/hour).
  submit: publicProcedure
    .use(contactRateLimit)
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: contactPhoneSchema,
        city: geoTextSchema.optional(),
        message: safeString(2000, 10),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.enquiry.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          message: input.message,
          source: "Website",
          status: "New",
        },
      });

      // Don't leak the row id to anonymous submitters.
      return { ok: true };
    }),

  // Public: opt out of marketing communication per channel. Rate-limited.
  // Upserts so repeat submissions just refresh the reasons.
  unsubscribe: publicProcedure
    .use(contactRateLimit)
    .input(
      z.object({
        email: emailSchema,
        channels: z
          .array(z.enum(["email", "sms_whatsapp"]))
          .min(1, "Pick at least one channel"),
        reasons: z.array(z.enum(UNSUB_REASONS)).max(UNSUB_REASONS.length).default([]),
      }),
    )
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      await Promise.all(
        input.channels.map((channel) =>
          prisma.unsubscribeRequest.upsert({
            where: { email_channel: { email, channel } },
            create: { email, channel, reasons: input.reasons },
            update: { reasons: input.reasons },
          }),
        ),
      );
      return { ok: true };
    }),

  // Staff: list contact enquiries, newest first, optionally filtered by status.
  list: staffProcedure
    .input(
      z.object({
        status: enquiryStatusSchema.optional(),
        cursor: cursorSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit, status } = input;

      const items = await prisma.enquiry.findMany({
        where: status ? { status } : {},
        include: { handledBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  // Staff: counts by status for the dashboard header.
  stats: staffProcedure.query(async () => {
    const [total, newCount, inProgress, resolved, closed] = await Promise.all([
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: "New" } }),
      prisma.enquiry.count({ where: { status: "In Progress" } }),
      prisma.enquiry.count({ where: { status: "Resolved" } }),
      prisma.enquiry.count({ where: { status: "Closed" } }),
    ]);
    return { total, new: newCount, inProgress, resolved, closed };
  }),

  // Staff: move an enquiry through its lifecycle. Records who handled it.
  updateStatus: staffProcedure
    .input(z.object({ id: z.string().cuid(), status: enquiryStatusSchema }))
    .mutation(async ({ input, ctx }) => {
      const enquiry = await prisma.enquiry.findUnique({ where: { id: input.id } });
      if (!enquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found." });

      return prisma.enquiry.update({
        where: { id: input.id },
        data: {
          status: input.status,
          // Stamp the first responder; keep the original once set.
          handledById: enquiry.handledById ?? ctx.user.id,
        },
      });
    }),
});
