import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, adminProcedure } from "../server";
import { safeString, cuidSchema } from "../sanitize";
import { audienceSchema, audienceWhere } from "../waBroadcast";

// WhatsApp template library: approved BhashSMS templates copied into our
// dashboard (BhashSMS has no template-list API we use), grouped by WhatsApp's
// categories. Stored as one JSON SiteSetting — no schema change.
const WA_TEMPLATES_KEY = "wa.templates";
const waTemplateSchema = z.object({
  name: z.string().trim().regex(/^[a-zA-Z0-9_]{1,100}$/, "Template name: letters, numbers and _ only"),
  category: z.enum(["Utility", "Marketing", "Authentication"]),
  language: safeString(20).default("en"),
  body: safeString(1024, 1),
  variables: z.number().int().min(0).max(10),
});
type WaTemplate = z.infer<typeof waTemplateSchema>;
async function readTemplates(): Promise<WaTemplate[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: WA_TEMPLATES_KEY } });
  return Array.isArray(row?.value) ? (row!.value as WaTemplate[]) : [];
}
async function writeTemplates(list: WaTemplate[], editorId: string) {
  await prisma.siteSetting.upsert({
    where: { key: WA_TEMPLATES_KEY },
    create: { key: WA_TEMPLATES_KEY, value: list as object[], editorId },
    update: { value: list as object[], editorId },
  });
}

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
  // Marketing Dashboard (#19): real audience, sign-ups, lead sources, channel
  // codes, referrals and WhatsApp results for the chosen period.
  marketingOverview: adminProcedure
    .input(z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30) }))
    .query(async ({ input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const real = audienceWhere({});
      const [realUsers, optedIn, byRole, signups, leadsBySource, channels, referrals, bc, templates] = await Promise.all([
        prisma.user.count({ where: real }),
        prisma.user.count({ where: audienceWhere({ waOptIn: true }) }),
        prisma.user.groupBy({ by: ["role"], where: real, _count: { _all: true } }),
        prisma.user.count({ where: { AND: [real, { joined: { gte: since } }] } }),
        prisma.lead.groupBy({ by: ["source"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
        prisma.property.groupBy({
          by: ["channelCode"],
          where: { createdAt: { gte: since }, channelCode: { not: null }, deletedAt: null },
          _count: { _all: true },
        }),
        prisma.referralSubmission.count({ where: { createdAt: { gte: since } } }),
        prisma.waBroadcast.aggregate({
          where: { createdAt: { gte: since } },
          _count: { _all: true },
          _sum: { sent: true, failed: true },
        }),
        readTemplates(),
      ]);
      return {
        days: input.days,
        audience: {
          realUsers,
          optedIn,
          byRole: byRole.map((r) => ({ role: r.role, count: r._count._all })).sort((a, b) => b.count - a.count),
          signups,
        },
        leadsBySource: leadsBySource
          .map((g) => ({ source: g.source ?? "Portal", count: g._count._all }))
          .sort((a, b) => b.count - a.count),
        channels: channels
          .map((g) => ({ code: g.channelCode!, listings: g._count._all }))
          .sort((a, b) => b.listings - a.listings),
        referrals,
        whatsapp: {
          broadcasts: bc._count._all,
          sent: bc._sum.sent ?? 0,
          failed: bc._sum.failed ?? 0,
          templates: {
            Utility: templates.filter((t) => t.category === "Utility").length,
            Marketing: templates.filter((t) => t.category === "Marketing").length,
            Authentication: templates.filter((t) => t.category === "Authentication").length,
          },
        },
      };
    }),

  waTemplates: adminProcedure.query(async () => readTemplates()),

  // Add or replace (by name) a template in the library.
  saveWaTemplate: adminProcedure.input(waTemplateSchema).mutation(async ({ input, ctx }) => {
    const list = (await readTemplates()).filter((t) => t.name !== input.name);
    list.push(input);
    list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    await writeTemplates(list, ctx.user.id);
    return { ok: true };
  }),

  deleteWaTemplate: adminProcedure
    .input(z.object({ name: z.string().max(100) }))
    .mutation(async ({ input, ctx }) => {
      await writeTemplates((await readTemplates()).filter((t) => t.name !== input.name), ctx.user.id);
      return { ok: true };
    }),

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
      // WhatsApp rule (boss 09-28): Marketing templates only to users who opted
      // in; Utility (account / listing / payment updates) to all real users.
      // A template not in our library is treated as Marketing, the safe default.
      const tpl = (await readTemplates()).find((t) => t.name === input.templateName);
      const category = tpl?.category ?? "Marketing";
      if (category === "Authentication") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "OTP / authentication templates can't be broadcast." });
      }
      const audience = category === "Marketing" ? { ...input.audience, waOptIn: true } : input.audience;

      const total = await prisma.user.count({ where: audienceWhere(audience) });
      if (total === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No recipients match this audience." });
      }
      return prisma.waBroadcast.create({
        data: {
          name: input.name,
          templateName: input.templateName,
          params: input.params,
          audience,
          total,
          status: "queued",
          createdById: ctx.user.id,
        },
        // Shallow return (no Json params/audience) keeps client inference cheap.
        select: { id: true, name: true, templateName: true, total: true, status: true },
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
