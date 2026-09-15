import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { BULK_IMPORT_MAX_ROWS } from "@nxtsft/shared";
import { notify } from "../notify";
import { router, staffProcedure, adminProcedure, generalRateLimit } from "../server";
import {
  cuidSchema,
  nameSchema,
  phoneSchema,
  emailSchema,
  geoTextSchema,
  safeString,
  noteSchema,
  searchSchema,
  pageSchema,
  limitSchema,
  datetimeSchema,
  repContactStatusSchema,
  repCallOutcomeSchema,
} from "../sanitize";

// Contacts are rep-owned: a sales rep only ever sees their own book, while an
// admin sees every rep's. Supervisors are scoped to their attributed reps, the
// same way leads.list scopes them.
const ADMIN_ROLES = ["admin", "super-admin"];
const isAdmin = (role: string) => ADMIN_ROLES.includes(role);

type Ctx = { user: { id: string; role: string } };

/** Owner clause for list/aggregate queries. Admins get `{}` (everything). */
async function ownerScope(ctx: Ctx): Promise<{ ownerId?: string | { in: string[] } }> {
  if (isAdmin(ctx.user.role)) return {};
  if (ctx.user.role === "supervisor") {
    const reps = await prisma.user.findMany({
      where: { supervisorId: ctx.user.id, role: "sales" },
      select: { id: true },
    });
    return { ownerId: { in: [ctx.user.id, ...reps.map((r) => r.id)] } };
  }
  return { ownerId: ctx.user.id };
}

/** Load a contact and assert the caller may act on it. */
async function ownedContact(ctx: Ctx, id: string) {
  const contact = await prisma.repContact.findUnique({ where: { id } });
  if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found." });
  if (!isAdmin(ctx.user.role) && contact.ownerId !== ctx.user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This contact belongs to another rep." });
  }
  return contact;
}

const contactFields = {
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  city: geoTextSchema.optional(),
  interest: safeString(500).optional(),
  value: z.number().int().min(0).max(1_000_000_000).optional(),
};

export const repContactsRouter = router({
  // ─── Read ────────────────────────────────────────────────────────────────

  list: staffProcedure
    .input(
      z.object({
        status: repContactStatusSchema.optional(),
        search: searchSchema.optional(),
        batchId: cuidSchema.optional(),
        ownerId: cuidSchema.optional(), // admin-only filter; ignored for reps
        callbackDue: z.boolean().optional(),
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = { ...(await ownerScope(ctx)) };
      if (input.ownerId && isAdmin(ctx.user.role)) where.ownerId = input.ownerId;
      if (input.status) where.status = input.status;
      if (input.batchId) where.batchId = input.batchId;
      if (input.callbackDue) where.callbackAt = { lte: new Date() };
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.repContact.findMany({
          where,
          include: { owner: { select: { id: true, name: true } } },
          // Callbacks that are due surface first, then the freshest contacts.
          orderBy: [{ callbackAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
          take: input.limit,
          skip: (input.page - 1) * input.limit,
        }),
        prisma.repContact.count({ where }),
      ]);

      return { items, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) };
    }),

  get: staffProcedure.input(z.object({ id: cuidSchema })).query(async ({ input, ctx }) => {
    const contact = await ownedContact(ctx, input.id);
    const [notes, calls] = await Promise.all([
      prisma.repContactNote.findMany({
        where: { contactId: contact.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.repCall.findMany({
        where: { contactId: contact.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    // Note rows carry only an authorId; resolve the names in one pass.
    const authorIds = [...new Set(notes.map((n) => n.authorId))];
    const authors = authorIds.length
      ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(authors.map((u) => [u.id, u.name]));
    return {
      contact,
      notes: notes.map((n) => ({ ...n, authorName: nameById.get(n.authorId) ?? "Staff" })),
      calls,
    };
  }),

  stats: staffProcedure.query(async ({ ctx }) => {
    const scope = await ownerScope(ctx);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [byStatus, total, callbacksDue, callsToday] = await Promise.all([
      prisma.repContact.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.repContact.count({ where: scope }),
      prisma.repContact.count({ where: { ...scope, callbackAt: { lte: new Date() } } }),
      prisma.repCall.count({
        where: {
          createdAt: { gte: startOfDay },
          ...(isAdmin(ctx.user.role) ? {} : { repId: ctx.user.id }),
        },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of byStatus) counts[row.status] = row._count._all;
    return { total, counts, callbacksDue, callsToday };
  }),

  exportRows: staffProcedure
    .input(z.object({ status: repContactStatusSchema.optional(), batchId: cuidSchema.optional() }))
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = { ...(await ownerScope(ctx)) };
      if (input.status) where.status = input.status;
      if (input.batchId) where.batchId = input.batchId;

      const rows = await prisma.repContact.findMany({
        where,
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      return rows.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email ?? "",
        city: c.city ?? "",
        interest: c.interest ?? "",
        status: c.status,
        value: c.value ?? "",
        calls: c.callCount,
        lastCallAt: c.lastCallAt?.toISOString() ?? "",
        lastOutcome: c.lastOutcome ?? "",
        callbackAt: c.callbackAt?.toISOString() ?? "",
        owner: c.owner.name,
        addedAt: c.createdAt.toISOString(),
      }));
    }),

  // ─── Write ───────────────────────────────────────────────────────────────

  create: staffProcedure
    .use(generalRateLimit)
    .input(z.object(contactFields))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.repContact.findUnique({
        where: { ownerId_phone: { ownerId: ctx.user.id, phone: input.phone } },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This number is already in your contacts." });
      }
      return prisma.repContact.create({
        data: { ...input, ownerId: ctx.user.id, source: "manual" },
      });
    }),

  // One spreadsheet upload. Rows that fail validation are reported per-row
  // rather than failing the whole import; rows whose number the rep already has
  // are skipped by the [ownerId, phone] unique index.
  bulkCreate: staffProcedure
    .use(generalRateLimit)
    .input(
      z.object({
        rows: z
          .array(
            z.object({
              row: z.number().int().min(1), // spreadsheet row number, for error messages
              name: z.string(),
              phone: z.string(),
              email: z.string().optional(),
              city: z.string().optional(),
              interest: z.string().optional(),
              value: z.union([z.number(), z.string()]).optional(),
            }),
          )
          .min(1)
          .max(BULK_IMPORT_MAX_ROWS),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const rowSchema = z.object(contactFields);
      const errors: { row: number; message: string }[] = [];
      const valid: { row: number; d: z.infer<typeof rowSchema> }[] = [];

      for (const r of input.rows) {
        const rawValue = typeof r.value === "string" ? r.value.replace(/[^\d]/g, "") : r.value;
        const parsed = rowSchema.safeParse({
          name: r.name?.trim(),
          phone: r.phone?.trim(),
          email: r.email?.trim() || undefined,
          city: r.city?.trim() || undefined,
          interest: r.interest?.trim() || undefined,
          value: rawValue ? Number(rawValue) : undefined,
        });
        if (!parsed.success) {
          errors.push({ row: r.row, message: parsed.error.issues[0]?.message ?? "Invalid row." });
          continue;
        }
        valid.push({ row: r.row, d: parsed.data });
      }

      // Collapse repeats inside the file before hitting the DB, so the skipped
      // count reflects real duplicates instead of a partial createMany.
      const seen = new Set<string>();
      const deduped: typeof valid = [];
      let skipped = 0;
      for (const v of valid) {
        if (seen.has(v.d.phone)) {
          skipped++;
          continue;
        }
        seen.add(v.d.phone);
        deduped.push(v);
      }

      const batchId = crypto.randomUUID();
      const result = deduped.length
        ? await prisma.repContact.createMany({
            data: deduped.map((v) => ({ ...v.d, ownerId: ctx.user.id, source: "import", batchId })),
            skipDuplicates: true,
          })
        : { count: 0 };

      skipped += deduped.length - result.count;
      return { created: result.count, skipped, errors, batchId };
    }),

  update: staffProcedure
    .input(z.object({ id: cuidSchema }).extend(contactFields).partial({ name: true, phone: true }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await ownedContact(ctx, id);
      return prisma.repContact.update({ where: { id }, data });
    }),

  setStatus: staffProcedure
    .input(z.object({ id: cuidSchema, status: repContactStatusSchema }))
    .mutation(async ({ input, ctx }) => {
      await ownedContact(ctx, input.id);
      // "Converted" is owned by convertToLead — it also has to create the Lead.
      if (input.status === "Converted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use Convert to Lead to mark a contact converted." });
      }
      return prisma.repContact.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  addNote: staffProcedure
    .input(z.object({ id: cuidSchema, text: noteSchema }))
    .mutation(async ({ input, ctx }) => {
      await ownedContact(ctx, input.id);
      return prisma.repContactNote.create({
        data: { contactId: input.id, authorId: ctx.user.id, text: input.text },
      });
    }),

  // Click-to-call is a plain tel: link, so the rep records what happened after
  // the dial. Writes the call row, rolls the denormalised fields on the contact,
  // and mirrors into SalesActivity so the existing Activity Log tab sees it.
  logCall: staffProcedure
    .input(
      z.object({
        id: cuidSchema,
        outcome: repCallOutcomeSchema,
        durationSec: z.number().int().min(0).max(86_400).optional(),
        remark: safeString(500).optional(),
        callbackAt: datetimeSchema.optional(),
        status: repContactStatusSchema.optional(), // tag Hot/Warm/Cold/NI in the same action
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const contact = await ownedContact(ctx, input.id);
      const now = new Date();

      const [call, updated] = await prisma.$transaction([
        prisma.repCall.create({
          data: {
            contactId: contact.id,
            repId: ctx.user.id,
            outcome: input.outcome,
            durationSec: input.durationSec,
            remark: input.remark,
          },
        }),
        prisma.repContact.update({
          where: { id: contact.id },
          data: {
            lastCallAt: now,
            lastOutcome: input.outcome,
            callCount: { increment: 1 },
            // A callback keeps its due date; any other outcome clears a stale one.
            callbackAt: input.outcome === "callback" ? (input.callbackAt ? new Date(input.callbackAt) : null) : null,
            ...(input.status && input.status !== "Converted" ? { status: input.status } : {}),
          },
        }),
      ]);

      await prisma.salesActivity.create({
        data: {
          salesRepId: ctx.user.id,
          type: "call",
          action: `Called ${contact.name} (${contact.phone})`,
          outcome: input.outcome,
        },
      });

      return { call, contact: updated };
    }),

  // Promote a contact into the real pipeline: find-or-create the customer's
  // account by phone (same fallback email shape as the admin bulk import), then
  // create the Lead already assigned to this rep.
  convertToLead: staffProcedure
    .input(z.object({ id: cuidSchema, plan: safeString(100).optional(), value: z.number().int().min(0).optional() }))
    .mutation(async ({ input, ctx }) => {
      const contact = await ownedContact(ctx, input.id);
      if (contact.leadId) {
        throw new TRPCError({ code: "CONFLICT", message: "This contact is already converted." });
      }

      let user = await prisma.user.findUnique({ where: { phone: contact.phone }, select: { id: true } });
      if (!user) {
        const email = contact.email ?? `rep.${contact.phone}@nxtsft.internal`;
        const emailTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (emailTaken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That email is already registered to a different account. Edit the contact's email and retry.",
          });
        }
        user = await prisma.user.create({
          data: {
            name: contact.name,
            phone: contact.phone,
            email,
            role: "home-seller",
            city: contact.city ?? "",
            metadata: { source: "rep-contact" },
          },
          select: { id: true },
        });
      }

      const rep = await prisma.user.findUnique({
        where: { id: contact.ownerId },
        select: { supervisorId: true },
      });

      const [lead] = await prisma.$transaction([
        prisma.lead.create({
          data: {
            userId: user.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            city: contact.city,
            interest: contact.interest,
            source: "Rep Contact",
            status: "Hot",
            value: input.value ?? contact.value,
            plan: input.plan,
            assignedToId: contact.ownerId,
            supervisorId: rep?.supervisorId,
            assignedAt: new Date(),
          },
        }),
        prisma.repContact.update({
          where: { id: contact.id },
          data: { status: "Converted" },
        }),
      ]);

      await prisma.repContact.update({ where: { id: contact.id }, data: { leadId: lead.id } });

      await notify({
        userId: contact.ownerId,
        type: "lead_update",
        title: "Contact converted to a lead",
        content: `${contact.name} is now an assigned lead.`,
        actionUrl: "/sales-portal",
      });

      return lead;
    }),

  delete: staffProcedure.input(z.object({ id: cuidSchema })).mutation(async ({ input, ctx }) => {
    const contact = await ownedContact(ctx, input.id);
    if (contact.leadId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Converted contacts cannot be deleted." });
    }
    await prisma.repContact.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  // ─── Admin ───────────────────────────────────────────────────────────────

  // Move contacts between reps. Recorded in AssignmentHistory like lead hops.
  reassign: adminProcedure
    .input(z.object({ ids: z.array(cuidSchema).min(1).max(500), toRepId: cuidSchema }))
    .mutation(async ({ input, ctx }) => {
      const rep = await prisma.user.findUnique({
        where: { id: input.toRepId },
        select: { id: true, role: true, name: true },
      });
      if (!rep || rep.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a sales rep to reassign to." });
      }

      // The [ownerId, phone] unique index means a number the target rep already
      // holds would fail the whole batch — drop those instead.
      const contacts = await prisma.repContact.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, phone: true },
      });
      const clashing = await prisma.repContact.findMany({
        where: { ownerId: rep.id, phone: { in: contacts.map((c) => c.phone) } },
        select: { phone: true },
      });
      const clashingPhones = new Set(clashing.map((c) => c.phone));
      const movable = contacts.filter((c) => !clashingPhones.has(c.phone)).map((c) => c.id);

      if (movable.length) {
        await prisma.repContact.updateMany({
          where: { id: { in: movable } },
          data: { ownerId: rep.id },
        });
        await prisma.assignmentHistory.create({
          data: {
            leadIds: movable,
            fromRole: ctx.user.role,
            toRole: "sales",
            assignedById: ctx.user.id,
            assignedToId: rep.id,
          },
        });
      }

      return { moved: movable.length, skipped: contacts.length - movable.length };
    }),

  reps: adminProcedure.query(() =>
    prisma.user.findMany({
      where: { role: "sales", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ),
});
