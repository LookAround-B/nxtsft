import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, adminProcedure } from "../server";
import { safeString, cuidSchema } from "../sanitize";
import { audienceSchema, audienceWhere } from "../waBroadcast";

export const campaignsRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.campaign.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: safeString(200, 3),
        type: z.enum(["email", "sms", "whatsapp"]),
        audience: z.enum(["all", "user", "sales", "admin"]).default("all"),
        subject: safeString(500).optional(),
        body: z.string().max(5000).optional(),
        budget: z.number().int().positive().optional(),
        scheduledAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.campaign.create({
        data: {
          name: input.name,
          type: input.type,
          audience: input.audience,
          subject: input.subject ?? null,
          body: input.body ?? null,
          budget: input.budget ?? null,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          status: input.scheduledAt ? "scheduled" : "draft",
          createdById: ctx.user.id,
        },
      });
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: cuidSchema,
        status: z.enum(["draft", "scheduled", "active", "paused", "completed"]),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // ── WhatsApp broadcast sender ────────────────────────────────────────────

  // Live recipient count + a small sample for the audience picker.
  audiencePreview: adminProcedure.input(audienceSchema).query(async ({ input }) => {
    const where = audienceWhere(input);
    const [count, sample] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { name: true, city: true, phone: true },
        take: 5,
        orderBy: { id: "asc" },
      }),
    ]);
    return { count, sample };
  }),

  // Queue a broadcast — the send-campaigns cron drains it in throttled batches.
  launchWhatsApp: adminProcedure
    .input(
      z.object({
        name: safeString(200, 3),
        templateName: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9_]+$/, "Template name: letters, numbers, underscores only"),
        params: z.array(safeString(500)).max(10).default([]),
        audience: audienceSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const total = await prisma.user.count({ where: audienceWhere(input.audience) });
      if (total === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No recipients match this audience." });
      }
      return prisma.waBroadcast.create({
        data: {
          name: input.name,
          templateName: input.templateName,
          params: input.params,
          audience: input.audience,
          total,
          status: "queued",
          createdById: ctx.user.id,
        },
      });
    }),

  broadcasts: adminProcedure.query(async () => {
    // Explicit select (no Json params/audience) — keeps the inferred client type
    // shallow (Prisma's JsonValue makes tRPC inference "excessively deep").
    return prisma.waBroadcast.findMany({
      select: {
        id: true,
        name: true,
        templateName: true,
        status: true,
        total: true,
        sent: true,
        failed: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  cancelBroadcast: adminProcedure.input(z.object({ id: cuidSchema })).mutation(async ({ input }) => {
    const b = await prisma.waBroadcast.findUnique({ where: { id: input.id } });
    if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Broadcast not found." });
    if (b.status === "completed") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This broadcast has already completed." });
    }
    return prisma.waBroadcast.update({ where: { id: input.id }, data: { status: "cancelled" } });
  }),
});
