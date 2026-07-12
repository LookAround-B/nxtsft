import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@nxtsft/db";
import { BULK_IMPORT_MAX_ROWS } from "@nxtsft/shared/constants";
import { notify, notifyCredit } from "../notify";
import { router, adminProcedure, superAdminProcedure } from "../server";
import {
  cuidSchema,
  nameSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  safeString,
  geoTextSchema,
  searchSchema,
  roleSchema,
  staffRoleSchema,
  propertyStatusSchema,
  propertyTypeSchema,
  purposeSchema,
  furnishingSchema,
  reraSchema,
  descriptionSchema,
  cursorSchema,
  pageSchema,
  limitSchema,
  ratingSchema,
  amenitiesSchema,
  safeUrlArraySchema,
  safeUrlSchema,
} from "../sanitize";
import { makeInteriorDesignerSlug } from "./interiorDesigners";
import { makeDecorStoreSlug } from "./decorStores";
import { generateSlug, assertReraValid, splitList, CATEGORY_IMAGE } from "./properties";
import { agentInitials, uniqueAgentSlug, defaultAgentMetadata } from "../agentProfile";



const safeUserSelect = {
  id: true,
  email: true,
  phone: true,
  name: true,
  avatar: true,
  role: true,
  verified: true,
  active: true,
  city: true,
  credits: true,
  joined: true,
  lastActive: true,
};

const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"];

// BigInt columns can't be JSON-serialized — convert before returning rows
// to the client (interiorDesigner / decorStore both carry startingBudget).
const serializeBudget = <T extends { startingBudget: bigint | null }>(row: T) => ({
  ...row,
  startingBudget: row.startingBudget != null ? Number(row.startingBudget) : null,
});

export const adminRouter = router({
  // Platform KPIs for the command dashboard
  stats: adminProcedure.query(async () => {
    const [
      totalUsers,
      totalProperties,
      activeListings,
      totalLeads,
      hotLeads,
      warmLeads,
      convertedLeads,
      siteVisitsCount,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { status: "Active", deletedAt: null } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "Hot" } }),
      prisma.lead.count({ where: { status: "Warm" } }),
      prisma.lead.count({ where: { status: "Converted" } }),
      prisma.siteVisit.count(),
      prisma.payment.aggregate({ where: { status: "Success" }, _sum: { amount: true } }),
    ]);

    return {
      totalUsers,
      totalProperties,
      activeListings,
      totalLeads,
      hotLeads,
      warmLeads,
      convertedLeads,
      siteVisitsCount,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0) / 100, // convert paise to rupees
    };
  }),

  // Live sidebar badge counts — one number per "needs action" queue.
  badgeCounts: adminProcedure.query(async () => {
    const [enquiries, kyc, sellerApprovals, listings, reviews, interiors, decor, escalations] =
      await Promise.all([
        prisma.enquiry.count({ where: { status: "New" } }),
        prisma.user.count({ where: { kycStatus: "pending" } }),
        prisma.user.count({ where: { role: { in: ["home-seller", "agent"] }, verified: false } }),
        prisma.propertyEditRequest.count({ where: { status: "Pending" } }),
        prisma.review.count({ where: { status: "Pending" } }),
        prisma.interiorDesigner.count({ where: { status: "pending" } }),
        prisma.decorStore.count({ where: { status: "pending" } }),
        prisma.escalation.count({ where: { status: "escalated" } }),
      ]);
    return { enquiries, kyc, sellerApprovals, listings, reviews, interiors, decor, escalations };
  }),

  // Escalations raised to admin by supervisors (status: "escalated")
  escalations: router({
    list: adminProcedure
      .input(z.object({ status: z.enum(["escalated", "resolved"]).optional() }).optional())
      .query(async ({ input }) => {
        const items = await prisma.escalation.findMany({
          where: { status: input?.status ?? "escalated" },
          include: {
            lead: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        const raisedByIds = [...new Set(items.map((e) => e.raisedById).filter((v): v is string => !!v))];
        const raisers = raisedByIds.length
          ? await prisma.user.findMany({ where: { id: { in: raisedByIds } }, select: { id: true, name: true } })
          : [];
        const raiserName = new Map(raisers.map((u) => [u.id, u.name]));

        const now = Date.now();
        return items.map((e) => ({
          id: e.id,
          leadId: e.leadId,
          leadName: e.lead?.name ?? "—",
          note: e.note,
          level: e.level,
          status: e.status,
          assignedTo: e.assignedTo?.name ?? "Unassigned",
          raisedBy: (e.raisedById && raiserName.get(e.raisedById)) || "—",
          createdAt: e.createdAt.toISOString(),
          ageHours: Math.max(0, Math.round((now - e.createdAt.getTime()) / (60 * 60 * 1000))),
        }));
      }),

    resolve: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input, ctx }) => {
        const escalation = await prisma.escalation.findUnique({ where: { id: input.id } });
        if (!escalation) throw new TRPCError({ code: "NOT_FOUND", message: "Escalation not found." });

        const [updated] = await Promise.all([
          prisma.escalation.update({
            where: { id: input.id },
            data: { status: "resolved", resolvedAt: new Date() },
          }),
          prisma.auditLog.create({
            data: {
              userId: ctx.user.id,
              action: "escalation_resolved",
              entity: "Escalation",
              entityId: input.id,
              changes: { leadId: escalation.leadId, level: escalation.level },
            },
          }),
        ]);
        return updated;
      }),
  }),

  // User management
  users: router({
    list: adminProcedure
      .input(
        z.object({
          role: roleSchema.optional(),
          search: searchSchema.optional(),
          city: geoTextSchema.optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, role, search, city } = input;

        const where: NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"] = {};
        if (role) where.role = role;
        if (city) where.city = { contains: city, mode: "insensitive" };
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ];
        }

        const items = await prisma.user.findMany({
          where,
          select: safeUserSelect,
          orderBy: { joined: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),

    get: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .query(async ({ input }) => {
        const user = await prisma.user.findUnique({ where: { id: input.id }, select: safeUserSelect });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        return user;
      }),

    // Super-admin only: change a user's role
    updateRole: superAdminProcedure
      .input(z.object({ userId: cuidSchema, role: roleSchema }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({ where: { id: input.userId } });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

        // Promoting to agent: seed the public directory profile (slug + metadata)
        // if missing, so a re-roled user shows correctly on /agents — mirrors the
        // self-service agent registration path in auth.registerSeller.
        const agentSeed =
          input.role === "agent" && !user.slug
            ? {
                slug: await uniqueAgentSlug(user.name),
                metadata: defaultAgentMetadata(user.name, user.city),
              }
            : {};

        return prisma.user.update({
          where: { id: input.userId },
          data: { role: input.role, ...agentSeed },
          select: safeUserSelect,
        });
      }),

    grantCredits: adminProcedure
      .input(
        z.object({
          userId: cuidSchema,
          amount: z.number().int().min(1).max(1000),
          reason: safeString(200),
        }),
      )
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, role: true },
        });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        if (!["user", "home-seller"].includes(user.role)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Credits can only be granted to Home Buyers or Home Sellers.",
          });
        }
        await Promise.all([
          prisma.user.update({
            where: { id: input.userId },
            data: { credits: { increment: input.amount } },
          }),
          prisma.creditTransaction.create({
            data: { userId: input.userId, type: "credit", amount: input.amount, reason: input.reason },
          }),
        ]);
        await notifyCredit({ userId: input.userId, type: "credit", amount: input.amount, reason: input.reason });
        return prisma.user.findUniqueOrThrow({
          where: { id: input.userId },
          select: { id: true, name: true, credits: true },
        });
      }),

    kycList: adminProcedure
      .input(
        z.object({
          kycStatus: z.enum(["pending", "verified", "unverified"]).optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, kycStatus } = input;
        const where = kycStatus
          ? { kycStatus }
          : { NOT: { kycStatus: "none" } };

        const items = await prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            kycStatus: true,
            joined: true,
            kycDocuments: { orderBy: { createdAt: "asc" as const } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),

    updateDocStatus: adminProcedure
      .input(
        z.object({
          docId: cuidSchema,
          status: z.enum(["pending", "verified", "unverified"]),
          adminNotes: safeString(500).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const doc = await prisma.kycDocument.findUnique({ where: { id: input.docId } });
        if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });

        return prisma.kycDocument.update({
          where: { id: input.docId },
          data: {
            status: input.status,
            adminNotes: input.adminNotes ?? null,
            reviewedAt: new Date(),
            reviewedById: ctx.user.id,
          },
        });
      }),

    setUserKycStatus: adminProcedure
      .input(
        z.object({
          userId: cuidSchema,
          kycStatus: z.enum(["none", "pending", "verified", "unverified"]),
          note: safeString(500).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true, role: true },
        });
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        if (!["user", "home-seller"].includes(user.role)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "KYC applies only to Home Buyers and Home Sellers.",
          });
        }

        await prisma.user.update({
          where: { id: input.userId },
          data: { kycStatus: input.kycStatus },
        });

        const label =
          input.kycStatus === "verified"
            ? "Verified ✓"
            : input.kycStatus === "unverified"
              ? "Not Verified"
              : "Pending Review";

        await prisma.notification.create({
          data: {
            userId: input.userId,
            type: "kyc_status",
            title: `KYC Status: ${label}`,
            content:
              input.note ??
              `Your KYC verification status has been updated to ${label}.`,
            actionUrl: "/user-portal#kyc",
          },
        });

        return { ok: true };
      }),

    verify: adminProcedure
      .input(z.object({ userId: cuidSchema }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.update({
          where: { id: input.userId },
          data: { verified: true, verifiedAt: new Date() },
          select: { ...safeUserSelect, role: true, name: true },
        });

        if (user.role === "home-seller") {
          await prisma.notification.create({
            data: {
              userId: input.userId,
              type: "account_approved",
              title: "Your account has been approved!",
              content: "You can now log in to NxtSft and list your property.",
              actionUrl: "/list",
            },
          });
        } else if (user.role === "agent") {
          await prisma.notification.create({
            data: {
              userId: input.userId,
              type: "account_approved",
              title: "Your agent account has been approved!",
              content:
                "Your agent profile is now live on NxtSft. Log in to manage your listings and details.",
              actionUrl: "/user-portal#mylist",
            },
          });
        }

        return user;
      }),
  }),

  // Property management for admin portal
  properties: router({
    list: adminProcedure
      .input(
        z.object({
          status: propertyStatusSchema.optional(),
          city: geoTextSchema.optional(),
          type: safeString(50).optional(),
          page: pageSchema.optional(),
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { limit, status, city, type } = input;
        const page = input.page ?? 1;

        const where: NonNullable<Parameters<typeof prisma.property.findMany>[0]>["where"] = { deletedAt: null };
        if (status) where.status = status;
        if (type) where.type = type;
        if (city) where.location = { city: { equals: city, mode: "insensitive" } };

        // Offset pagination + a matching total so the admin grid can show a
        // numbered pager. `counts` is DB-wide (ignores the status filter) so the
        // stat cards reflect the real library, not just the current page.
        const [items, total, byStatus] = await Promise.all([
          prisma.property.findMany({
            where,
            include: {
              location: true,
              owner: { select: { id: true, name: true, email: true, role: true } },
              _count: { select: { leads: true, favoritedBy: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: (page - 1) * limit,
          }),
          prisma.property.count({ where }),
          prisma.property.groupBy({
            by: ["status"],
            where: { deletedAt: null },
            _count: true,
          }),
        ]);

        const counts = { Active: 0, Pending: 0, Sold: 0, Rented: 0, Inactive: 0 } as Record<string, number>;
        for (const row of byStatus) counts[row.status] = row._count;

        return {
          items: items.map((p) => ({
            ...p,
            price: Number(p.price),
            pgDeposit: p.pgDeposit != null ? Number(p.pgDeposit) : null,
          })),
          page,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          total,
          counts,
        };
      }),

    approve: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const property = await prisma.property.findFirst({ where: { id: input.id, deletedAt: null } });
        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });
        if (!property.rera) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "RERA number required before approval." });
        }
        const updated = await prisma.property.update({ where: { id: input.id }, data: { status: "Active" } });
        await notify({
          userId: property.ownerId,
          type: "listing_approved",
          title: "Your listing is approved 🎉",
          content: `"${property.title}" is now live and visible to buyers.`,
          actionUrl: `/properties/${property.slug}`,
        });
        return {
          ...updated,
          price: Number(updated.price),
          pgDeposit: updated.pgDeposit != null ? Number(updated.pgDeposit) : null,
        };
      }),

    // Admin-only bulk import: each row carries its own owner (name/phone/email).
    // A matching phone reuses that user; otherwise a new dummy home-seller
    // account is created so the listing has a real owner to attribute to.
    // Both owner columns are optional: with no phone the row is attributed to the
    // importing admin, and an owner name alone becomes the listing's display name.
    bulkCreateListings: adminProcedure
      .input(z.object({ rows: z.array(z.unknown()).min(1).max(BULK_IMPORT_MAX_ROWS) }))
      .mutation(async ({ input, ctx }) => {
        // External spreadsheets commonly carry a country code / internal
        // spacing, e.g. "+91 75319 34532" — strip everything but digits and
        // drop a leading "91" before handing off to the strict shared schema.
        const bulkPhoneSchema = z.string().transform((s) => {
          const digits = s.replace(/\D/g, "");
          return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
        }).pipe(phoneSchema);

        // Same story for numbers: "₹1,76,72,460" / "1,668" (Indian-grouped,
        // currency-prefixed) fail z.coerce.number() outright — strip everything
        // but digits/sign/decimal point first. Junk placeholders ("N/A", "-")
        // clean down to nothing and become undefined so optionals stay optional.
        const cleanNumeric = (v: unknown) => {
          if (typeof v !== "string") return v;
          const cleaned = v.replace(/[^0-9.-]/g, "");
          return cleaned === "" || cleaned === "-" ? undefined : cleaned;
        };
        const bulkNum = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(cleanNumeric, schema);

        // External datasets use listing-style type names ("Highrise Apartment",
        // "Commercial Space") rather than our fixed enum — map the common ones;
        // anything else still falls through to propertyTypeSchema and fails loudly.
        const TYPE_ALIASES: Record<string, string> = {
          "highrise apartment": "Apartment",
          "high-rise apartment": "Apartment",
          "high rise apartment": "Apartment",
          "commercial space": "Office",
        };
        const bulkTypeSchema = z
          .string()
          .transform((s) => TYPE_ALIASES[s.trim().toLowerCase()] ?? s.trim())
          .pipe(propertyTypeSchema);

        // Furnishing synonyms from external datasets → our fixed enum.
        const FURNISHING_ALIASES: Record<string, string> = {
          "fully furnished": "Furnished",
          "fully-furnished": "Furnished",
          "semi furnished": "Semi-Furnished",
          "semifurnished": "Semi-Furnished",
          "bare shell": "Unfurnished",
          "unfurnished": "Unfurnished",
        };
        const bulkFurnishingSchema = z.preprocess(
          // Plot/land rows carry "N/A" — treat placeholder junk as absent.
          (v) => (typeof v === "string" && ["n/a", "na", "-", ""].includes(v.trim().toLowerCase()) ? undefined : v),
          z
            .string()
            .transform((s) => FURNISHING_ALIASES[s.trim().toLowerCase()] ?? s.trim())
            .pipe(furnishingSchema)
            .optional(),
        );

        // Owner identity is optional. A blank owner phone means "this row belongs
        // to the admin running the import"; a blank owner name then means the
        // listing simply shows that admin's name. A name without a phone sets the
        // per-listing display override (Property.ownerName) instead of minting an
        // account — that's how one import shows many owners without many logins.
        const blankToUndefined = (v: unknown) =>
          typeof v === "string" && ["", "-", "n/a", "na"].includes(v.trim().toLowerCase()) ? undefined : v;

        const rowSchema = z.object({
          ownerName: z.preprocess(blankToUndefined, nameSchema.optional()),
          ownerPhone: z.preprocess(blankToUndefined, bulkPhoneSchema.optional()),
          ownerEmail: z.preprocess(blankToUndefined, emailSchema.optional()),

          title: safeString(200, 10),
          description: descriptionSchema.optional(),
          type: bulkTypeSchema,
          purpose: purposeSchema,
          price: bulkNum(z.coerce.number().int().positive().max(999_999_999_999)),
          area: bulkNum(z.coerce.number().int().positive().max(9_999_999)),
          builtUpArea: bulkNum(z.coerce.number().int().positive().max(9_999_999).optional()),
          bhk: safeString(20).optional(),
          bedrooms: bulkNum(z.coerce.number().int().min(0).max(50).default(0)),
          bathrooms: bulkNum(z.coerce.number().int().min(0).max(50).default(0)),
          balconies: bulkNum(z.coerce.number().int().min(0).max(50).optional()),
          parking: bulkNum(z.coerce.number().int().min(0).max(50).optional()),
          furnishing: bulkFurnishingSchema,
          facing: safeString(30).optional(),
          floors: safeString(20).optional(),
          age: safeString(20).optional(),
          possession: safeString(30).optional(),
          builder: safeString(100).optional(),
          reraLabel: safeString(20).optional(),
          rera: reraSchema.optional(),
          city: geoTextSchema,
          state: geoTextSchema,
          locality: geoTextSchema,
          address: safeString(500).optional(),
          zipCode: safeString(6).optional(),
          latitude: bulkNum(z.coerce.number().min(-90).max(90).optional()),
          longitude: bulkNum(z.coerce.number().min(-180).max(180).optional()),
          amenities: safeString(2000).optional(),
          images: safeString(4000).optional(),
          virtualTourUrl: safeString(500).optional(),
          walkthroughVideoUrl: safeString(500).optional(),
          pgGender: z.enum(["Boys", "Girls", "Co-living"]).optional(),
          pgOccupancy: safeString(200).optional(),
          pgAvailableBeds: bulkNum(z.coerce.number().int().min(0).max(9999).optional()),
          pgDeposit: bulkNum(z.coerce.number().int().min(0).max(999_999_999_999).optional()),
          pgRoomTypes: safeString(200).optional(),
          pgHouseRules: safeString(2000).optional(),
          pgFood: safeString(30).optional(),
        });

        const errors: { row: number; message: string }[] = [];
        const createdListings: { id: string; slug: string; title: string }[] = [];

        // Phase 1 — parse + synchronous validation (RERA format etc). Cheap,
        // no DB calls, so this stays a plain loop.
        type Row = z.infer<typeof rowSchema>;
        const valid: { sheetRow: number; d: Row }[] = [];
        for (let i = 0; i < input.rows.length; i++) {
          const sheetRow = i + 2;
          const parsed = rowSchema.safeParse(input.rows[i]);
          if (!parsed.success) {
            errors.push({ row: sheetRow, message: parsed.error.issues[0]?.message ?? "Invalid row" });
            continue;
          }
          try {
            assertReraValid(parsed.data.city, parsed.data.rera, parsed.data.reraLabel);
            valid.push({ sheetRow, d: parsed.data });
          } catch (e) {
            errors.push({ row: sheetRow, message: e instanceof TRPCError ? e.message : "Invalid RERA details" });
          }
        }

        // The DB is remote and the shared pool is capped at ONE connection
        // (packages/db/client.ts — deliberate, for Vercel serverless), so this
        // handler must issue a constant number of batch queries, never one
        // query per row: per-row inserts made a 1000-row file take 5+ minutes
        // and time out. Everything below is createMany/findMany over the whole
        // batch — ~7 round-trips total regardless of file size.

        // Phase 2 — resolve owners in bulk. Only rows that name an owner phone get
        // an account of their own; phone-less rows fall back to the importing
        // admin. First-seen row per new phone supplies name/email/city for account
        // creation (first row wins).
        const uniquePhones = [
          ...new Set(valid.map((v) => v.d.ownerPhone).filter((p): p is string => !!p)),
        ];
        const existingOwners = uniquePhones.length
          ? await prisma.user.findMany({
              where: { phone: { in: uniquePhones } },
              select: { id: true, phone: true },
            })
          : [];
        const ownerIdByPhone = new Map(existingOwners.map((u) => [u.phone, u.id] as const));

        const newPhoneInfo = new Map<string, { name: string; email: string; city: string }>();
        const usedEmails = new Set<string>();
        const emailConflictPhones = new Set<string>();
        // A brand-new account needs a name; we won't invent one. Rows that give a
        // phone we've never seen but no name are rejected rather than silently
        // creating a user called "Owner".
        const namelessNewPhones = new Set<string>();
        for (const { d } of valid) {
          if (!d.ownerPhone) continue;
          if (ownerIdByPhone.has(d.ownerPhone) || newPhoneInfo.has(d.ownerPhone)) continue;
          if (!d.ownerName) {
            namelessNewPhones.add(d.ownerPhone);
            continue;
          }
          const email = d.ownerEmail ?? `dummy.${d.ownerPhone}@nxtsft.internal`;
          if (usedEmails.has(email)) {
            emailConflictPhones.add(d.ownerPhone);
            continue;
          }
          usedEmails.add(email);
          newPhoneInfo.set(d.ownerPhone, { name: d.ownerName, email, city: d.city });
        }

        if (usedEmails.size > 0) {
          const emailTaken = await prisma.user.findMany({
            where: { email: { in: [...usedEmails] } },
            select: { email: true },
          });
          const takenEmails = new Set(emailTaken.map((u) => u.email));
          for (const [phone, info] of newPhoneInfo) {
            if (takenEmails.has(info.email)) emailConflictPhones.add(phone);
          }
        }

        const ownersToCreate = [...newPhoneInfo.entries()]
          .filter(([phone]) => !emailConflictPhones.has(phone))
          .map(([phone, info]) => ({
            name: info.name,
            phone,
            email: info.email,
            role: "home-seller",
            city: info.city,
            verified: true,
            verifiedAt: new Date(),
            metadata: { source: "admin-bulk-upload" },
          }));
        if (ownersToCreate.length > 0) {
          // skipDuplicates absorbs races on the unique phone/email columns.
          await prisma.user.createMany({ data: ownersToCreate, skipDuplicates: true });
          const createdOwners = await prisma.user.findMany({
            where: { phone: { in: ownersToCreate.map((o) => o.phone) } },
            select: { id: true, phone: true },
          });
          for (const u of createdOwners) ownerIdByPhone.set(u.phone, u.id);
        }

        // A row without an owner phone belongs to the admin running the import.
        const ownerIdFor = (d: Row): string | undefined =>
          d.ownerPhone ? ownerIdByPhone.get(d.ownerPhone) : ctx.user.id;

        for (const v of valid) {
          const phone = v.d.ownerPhone;
          if (ownerIdFor(v.d)) continue;
          errors.push({
            row: v.sheetRow,
            message: !phone
              ? "Failed to resolve owner account."
              : namelessNewPhones.has(phone)
                ? "Owner name is required when an owner phone is given for a new account."
                : emailConflictPhones.has(phone)
                  ? "Owner email already registered to a different account."
                  : "Failed to create owner account.",
          });
        }
        const rowsWithOwner = valid.filter((v) => !!ownerIdFor(v.d));

        // Phase 3 — duplicate detection. A RERA number is a *project-level*
        // registration shared by every unit and every owner in that project
        // (a 750-flat tower carries one RERA), so it is NOT globally unique —
        // treating it as such collapsed a whole project down to one listing.
        // A row is therefore a duplicate only when the SAME owner already has a
        // listing with that RERA for the SAME purpose (a re-upload/spam), or the
        // same owner already has a listing with the same title + city + purpose.
        // Different owners listing in the same project are allowed. Purpose is in
        // both keys because one owner may legitimately sell one unit and rent
        // another in the same project. The same rule dedupes rows within the file.
        //
        // Owner identity is the account id *plus* any display override: phone-less
        // rows all share the importing admin's account, so without the override a
        // seeded project of 12 differently-named owners would collapse to one row.
        const ownerKey = (ownerId: string, displayName: string | null) =>
          `${ownerId}|${(displayName ?? "").toLowerCase()}`;

        const ownerIds = [...new Set(rowsWithOwner.map((v) => ownerIdFor(v.d)!))];
        const reras = [...new Set(rowsWithOwner.map((v) => v.d.rera).filter((r): r is string => !!r))];
        const titles = [...new Set(rowsWithOwner.map((v) => v.d.title))];
        const dupCandidates = await prisma.property.findMany({
          where: {
            deletedAt: null,
            ownerId: { in: ownerIds },
            OR: [
              ...(reras.length ? [{ rera: { in: reras } }] : []),
              { title: { in: titles } },
            ],
          },
          select: { rera: true, ownerId: true, ownerName: true, title: true, purpose: true, location: { select: { city: true } } },
        });
        const existingOwnerRera = new Set(
          dupCandidates
            .filter((p) => p.rera)
            .map((p) => `${ownerKey(p.ownerId, p.ownerName)}|${p.rera}|${p.purpose}`),
        );
        const existingOwnerTitleCity = new Set(
          dupCandidates.map(
            (p) =>
              `${ownerKey(p.ownerId, p.ownerName)}|${p.title.toLowerCase()}|${(p.location?.city ?? "").toLowerCase()}|${p.purpose}`,
          ),
        );

        const toInsert: {
          sheetRow: number;
          d: Row;
          slug: string;
          ownerId: string;
          displayName: string | null;
        }[] = [];
        const seenInFile = new Set<string>();
        for (const { sheetRow, d } of rowsWithOwner) {
          const ownerId = ownerIdFor(d)!;
          // With a phone the row gets its own account, so the account's name is
          // already the right one — no override. Without a phone the row rides on
          // the admin's account, and any name in the CSV becomes the display name.
          const displayName = d.ownerPhone ? null : (d.ownerName ?? null);
          const oKey = ownerKey(ownerId, displayName);

          const titleCityKey = `${oKey}|${d.title.toLowerCase()}|${d.city.toLowerCase()}|${d.purpose}`;
          const fileKey = d.rera ? `rera|${oKey}|${d.rera}|${d.purpose}` : `otc|${titleCityKey}`;
          const isDupe =
            (d.rera && existingOwnerRera.has(`${oKey}|${d.rera}|${d.purpose}`)) ||
            existingOwnerTitleCity.has(titleCityKey) ||
            seenInFile.has(fileKey);
          if (isDupe) {
            errors.push({ row: sheetRow, message: "Duplicate listing — skipped (this owner already has a listing with the same RERA, or same title + city, for this purpose)." });
            continue;
          }
          seenInFile.add(fileKey);
          // generateSlug's uniqueness suffix is Date.now(), which is identical
          // across a tight loop — append the sheet row to keep slugs unique
          // within this batch.
          toInsert.push({ sheetRow, d, ownerId, displayName, slug: `${generateSlug(d.title, d.city)}-${sheetRow}` });
        }

        // Phase 4 — insert everything in two batch statements: properties
        // first, then their Location rows keyed by the slugs we just created.
        if (toInsert.length > 0) {
          await prisma.property.createMany({
            data: toInsert.map(({ d, slug, ownerId, displayName }) => {
              const images = splitList(d.images);
              const isPg = d.type === "PG";
              return {
                ownerName: displayName,
                title: d.title,
                description: d.description,
                type: d.type,
                purpose: d.purpose,
                bhk: d.bhk,
                bedrooms: d.bedrooms,
                bathrooms: d.bathrooms,
                balconies: d.balconies,
                parking: d.parking,
                furnishing: d.furnishing,
                facing: d.facing,
                floors: d.floors,
                age: d.age,
                possession: d.possession,
                builder: d.builder,
                reraLabel: d.reraLabel,
                rera: d.rera,
                slug,
                price: BigInt(d.price),
                pricePerSqft: Math.round(d.price / d.area),
                area: d.area,
                builtUpArea: d.builtUpArea,
                amenities: splitList(d.amenities),
                images: images.length ? images : [CATEGORY_IMAGE[d.type] ?? CATEGORY_IMAGE.Apartment!],
                virtualTourUrl: d.virtualTourUrl,
                walkthroughVideoUrl: d.walkthroughVideoUrl,
                status: "Active",
                ownerId,
                ...(isPg
                  ? {
                      pgGender: d.pgGender,
                      pgOccupancy: splitList(d.pgOccupancy),
                      pgAvailableBeds: d.pgAvailableBeds,
                      pgDeposit: d.pgDeposit != null ? BigInt(d.pgDeposit) : undefined,
                      pgRoomTypes: splitList(d.pgRoomTypes),
                      pgHouseRules: splitList(d.pgHouseRules),
                      pgFood: d.pgFood,
                    }
                  : {}),
              };
            }),
          });

          const insertedProps = await prisma.property.findMany({
            where: { slug: { in: toInsert.map((t) => t.slug) } },
            select: { id: true, slug: true, title: true },
          });
          const idBySlug = new Map(insertedProps.map((p) => [p.slug, p.id] as const));

          await prisma.location.createMany({
            data: toInsert
              .filter((t) => idBySlug.has(t.slug))
              .map(({ d, slug }) => ({
                propertyId: idBySlug.get(slug)!,
                city: d.city,
                state: d.state,
                locality: d.locality,
                address: d.address,
                zipCode: d.zipCode,
                latitude: d.latitude ?? 0,
                longitude: d.longitude ?? 0,
              })),
            skipDuplicates: true,
          });

          for (const t of toInsert) {
            const id = idBySlug.get(t.slug);
            if (id) createdListings.push({ id, slug: t.slug, title: t.d.title });
            else errors.push({ row: t.sheetRow, message: "Failed to create listing" });
          }
        }

        const created = createdListings.length;
        errors.sort((a, b) => a.row - b.row);

        return {
          received: input.rows.length,
          created,
          failed: errors.length,
          errors: errors.slice(0, 100),
          createdListings,
        };
      }),

    // Seller edit requests on live listings (PropertyEditRequest). Admins review
    // the proposed field changes and either merge them into the property or reject.
    editRequests: router({
      list: adminProcedure
        .input(z.object({ cursor: cursorSchema, limit: limitSchema }))
        .query(async ({ input }) => {
          const { cursor, limit } = input;
          const items = await prisma.propertyEditRequest.findMany({
            where: { status: "Pending" },
            include: {
              owner: { select: { id: true, name: true, email: true } },
              property: {
                include: { location: { select: { city: true, locality: true, latitude: true, longitude: true } } },
              },
            },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });

          const hasMore = items.length > limit;
          const page = hasMore ? items.slice(0, limit) : items;
          return {
            items: page.map((r) => ({
              ...r,
              property: {
                ...r.property,
                price: Number(r.property.price),
                pgDeposit: r.property.pgDeposit != null ? Number(r.property.pgDeposit) : null,
              },
            })),
            nextCursor: page.at(-1)?.id ?? null,
            hasMore,
          };
        }),

      approve: adminProcedure
        .input(z.object({ id: cuidSchema }))
        .mutation(async ({ input, ctx }) => {
          const request = await prisma.propertyEditRequest.findUnique({
            where: { id: input.id },
            include: { property: true },
          });
          if (!request || request.status !== "Pending") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Edit request not found or already handled." });
          }

          const c = request.changes as Record<string, unknown>;
          const has = (k: string) => Object.prototype.hasOwnProperty.call(c, k);
          const num = (v: unknown) => (typeof v === "number" ? v : undefined);
          const str = (v: unknown) => (typeof v === "string" ? v : undefined);
          const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : undefined);

          // Scalar Property columns a seller can edit (mirrors properties.submitEdit).
          const stringFields = ["title", "description", "bhk", "furnishing", "facing", "possession", "rera", "reraLabel", "areaUnit"] as const;
          const intFields = ["builtUpArea", "bedrooms", "bathrooms", "balconies", "parking"] as const;

          const data: Parameters<typeof prisma.property.update>[0]["data"] = {};
          for (const f of stringFields) if (has(f)) data[f] = str(c[f]);
          for (const f of intFields) if (has(f)) data[f] = num(c[f]);
          if (has("amenities")) data.amenities = arr(c.amenities);
          if (has("images")) data.images = arr(c.images);
          if (has("price")) data.price = BigInt(num(c.price)!);
          if (has("area")) data.area = num(c.area);

          // pricePerSqft is derived — recompute when either price or area changes,
          // falling back to the property's current value for the untouched side.
          if (has("price") || has("area")) {
            const nextPrice = num(c.price) ?? Number(request.property.price);
            const nextArea = num(c.area) ?? request.property.area;
            data.pricePerSqft = Math.round(nextPrice / nextArea);
          }

          if (has("locality") || has("latitude") || has("longitude")) {
            data.location = {
              update: {
                ...(has("locality") ? { locality: str(c.locality) } : {}),
                ...(has("latitude") ? { latitude: num(c.latitude) } : {}),
                ...(has("longitude") ? { longitude: num(c.longitude) } : {}),
              },
            };
          }

          await prisma.property.update({ where: { id: request.propertyId }, data });
          await prisma.propertyEditRequest.update({
            where: { id: request.id },
            data: { status: "Approved", reviewedById: ctx.user.id, reviewedAt: new Date() },
          });
          await notify({
            userId: request.ownerId,
            type: "listing_edit_approved",
            title: "Your listing changes have been approved!",
            content: `The changes to "${request.property.title}" have been approved and are now live.`,
            actionUrl: `/properties/${request.property.slug}`,
          });

          return { ok: true };
        }),

      reject: adminProcedure
        .input(z.object({ id: cuidSchema, note: safeString(500).optional() }))
        .mutation(async ({ input, ctx }) => {
          const request = await prisma.propertyEditRequest.findUnique({
            where: { id: input.id },
            include: { property: { select: { title: true } } },
          });
          if (!request || request.status !== "Pending") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Edit request not found or already handled." });
          }

          await prisma.propertyEditRequest.update({
            where: { id: request.id },
            data: { status: "Rejected", reviewNote: input.note, reviewedById: ctx.user.id, reviewedAt: new Date() },
          });
          await notify({
            userId: request.ownerId,
            type: "listing_edit_rejected",
            title: "Your listing changes were not approved",
            content:
              input.note ??
              `The changes to "${request.property.title}" were not approved. Please review and resubmit.`,
            actionUrl: "/user-portal#mylist",
          });

          return { ok: true };
        }),
    }),
  }),

  // All leads across the platform
  leads: router({
    list: adminProcedure
      .input(
        z.object({
          status: safeString(50).optional(),
          assignedToId: cuidSchema.optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, status, assignedToId } = input;

        const where: NonNullable<Parameters<typeof prisma.lead.findMany>[0]>["where"] = {};
        if (status) where.status = status;
        if (assignedToId) where.assignedToId = assignedToId;

        const items = await prisma.lead.findMany({
          where,
          include: {
            property: { select: { id: true, title: true, slug: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),
  }),

  // Audit log
  auditLog: adminProcedure
    .input(
      z.object({
        entity: safeString(100).optional(),
        cursor: cursorSchema,
        limit: limitSchema.default(50),
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit, entity } = input;

      const where = entity ? { entity } : {};

      const items = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;
      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  // Home Buyer property-view activity feed
  buyerActivity: adminProcedure
    .input(
      z.object({
        search: searchSchema.optional(),
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { page, limit, search } = input;

      const userFilter: NonNullable<Parameters<typeof prisma.user.findMany>[0]>["where"] = {
        role: "user",
      };
      if (search) {
        userFilter.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      const where: NonNullable<Parameters<typeof prisma.propertyView.findMany>[0]>["where"] = {
        userId: { not: null },
        user: userFilter,
      };

      const views = await prisma.propertyView.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
              location: { select: { city: true, locality: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.propertyView.count({ where });

      return {
        items: views.map((v) => ({
          id: v.id,
          createdAt: v.createdAt.toISOString(),
          durationSec: v.durationSec,
          contactUnlocked: v.contactUnlocked,
          buyer: v.user,
          property: v.property ?? null,
        })),
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
      };
    }),

  // Credit usage audit — which buyer used credits to view which property
  creditUsage: adminProcedure
    .input(
      z.object({
        search: searchSchema.optional(),
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { page, limit, search } = input;

      const where: NonNullable<Parameters<typeof prisma.creditTransaction.findMany>[0]>["where"] = {
        reason: "contact_unlock",
        type: "debit",
      };

      if (search) {
        const matchingUsers = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
          select: { id: true },
          take: 100,
        });
        where.userId = { in: matchingUsers.map((u) => u.id) };
      }

      const txns = await prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      });
      const total = await prisma.creditTransaction.count({ where });

      const userIds = [...new Set(txns.map((t) => t.userId))];
      const propertyIds = [
        ...new Set(txns.map((t) => t.propertyId).filter((id): id is string => !!id)),
      ];

      const [users, properties] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, credits: true },
        }),
        prisma.property.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, title: true, slug: true },
        }),
      ]);

      const userById = new Map(users.map((u) => [u.id, u]));
      const propertyById = new Map(properties.map((p) => [p.id, p]));

      return {
        items: txns.map((t) => ({
          id: t.id,
          createdAt: t.createdAt.toISOString(),
          buyer: userById.get(t.userId) ?? null,
          property: t.propertyId ? (propertyById.get(t.propertyId) ?? null) : null,
        })),
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
      };
    }),

  // Real commission overview across all sales reps — replaces the old fully
  // hardcoded Commissions tab (fake ₹6.42L / bank accounts). Amounts are in
  // rupees (Commission.amount). Returns zeros when there are no commissions.
  commissionsOverview: adminProcedure.query(async () => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const commissions = await prisma.commission.findMany({
      include: { salesRep: { select: { id: true, name: true, kycStatus: true } } },
      orderBy: { createdAt: "desc" },
    });
    const amt = (c: (typeof commissions)[number]) => Number(c.amount);

    const payable = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + amt(c), 0);
    const onHold = commissions
      .filter((c) => c.status === "pending" && c.salesRep.kycStatus !== "verified")
      .reduce((s, c) => s + amt(c), 0);
    const ytdPaid = commissions
      .filter((c) => c.status === "cleared" && c.createdAt >= startOfYear)
      .reduce((s, c) => s + amt(c), 0);

    const byRep = new Map<
      string,
      { repId: string; name: string; kycVerified: boolean; closed: number; earned: number; pending: number }
    >();
    for (const c of commissions) {
      const row = byRep.get(c.salesRepId) ?? {
        repId: c.salesRepId,
        name: c.salesRep.name,
        kycVerified: c.salesRep.kycStatus === "verified",
        closed: 0,
        earned: 0,
        pending: 0,
      };
      row.closed += 1;
      row.earned += amt(c);
      if (c.status === "pending") row.pending += amt(c);
      byRep.set(c.salesRepId, row);
    }

    return {
      payable,
      onHold,
      ytdPaid,
      byRep: [...byRep.values()].sort((a, b) => b.earned - a.earned),
    };
  }),

  // Transaction history — all subscription/credit payments across gateways
  // (LA-331). Backs the admin Transactions tab: gateway/status/date filters,
  // search by payer email/name or gateway payment id, CSV export on the client.
  payments: adminProcedure
    .input(
      z.object({
        gateway: z.enum(["razorpay", "payu"]).optional(),
        status: z.enum(["Success", "Pending", "Failed", "Refunded"]).optional(),
        search: searchSchema.optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        page: pageSchema,
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      const { page, limit, gateway, status, search, dateFrom, dateTo } = input;

      const where: NonNullable<Parameters<typeof prisma.payment.findMany>[0]>["where"] = {};
      if (gateway) where.gateway = gateway;
      if (status) where.status = status;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        // dateTo is a calendar day (inclusive) — extend to end of that day.
        if (dateTo) where.createdAt.lte = new Date(new Date(dateTo).getTime() + 86_399_999);
      }
      if (search) {
        where.OR = [
          { user: { email: { contains: search, mode: "insensitive" } } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          { razorpayId: { contains: search, mode: "insensitive" } },
          { razorpayOrderId: { contains: search, mode: "insensitive" } },
          { payuMihpayId: { contains: search, mode: "insensitive" } },
          { payuTxnId: { contains: search, mode: "insensitive" } },
        ];
      }

      const [rows, total, successAgg] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.payment.count({ where }),
        prisma.payment.aggregate({ where: { ...where, status: "Success" }, _sum: { amount: true } }),
      ]);

      return {
        items: rows.map((p) => ({
          id: p.id,
          name: p.user.name,
          email: p.user.email,
          plan: p.description ?? "—",
          amount: Number(p.amount) / 100, // paise → rupees
          gateway: p.gateway,
          method: p.method,
          status: p.status,
          paymentId: p.razorpayId ?? p.payuMihpayId ?? p.payuTxnId ?? p.razorpayOrderId ?? "—",
          createdAt: p.createdAt.toISOString(),
        })),
        collected: Number(successAgg._sum.amount ?? 0n) / 100,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
      };
    }),

  // Property types active/inactive (LA-330). We don't have a PropertyType
  // master table — `Property.type` is a free string validated by an enum.
  // Instead of a heavy CMS + migration, we persist a "disabled" set in
  // SiteSetting; disabling a type hides it from the browse filter and the
  // "list your property" form without touching existing listings.
  propertyTypes: adminProcedure.query(async () => {
    const [setting, counts] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "property_types.disabled" } }),
      prisma.property.groupBy({ by: ["type"], where: { deletedAt: null }, _count: true }),
    ]);
    const disabled = new Set((setting?.value as string[] | undefined) ?? []);
    const countByType = new Map(counts.map((c) => [c.type, c._count]));
    return propertyTypeSchema.options.map((type) => ({
      type,
      enabled: !disabled.has(type),
      count: countByType.get(type) ?? 0,
    }));
  }),

  setPropertyTypeEnabled: adminProcedure
    .input(z.object({ type: propertyTypeSchema, enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const setting = await prisma.siteSetting.findUnique({ where: { key: "property_types.disabled" } });
      const disabled = new Set((setting?.value as string[] | undefined) ?? []);
      if (input.enabled) disabled.delete(input.type);
      else disabled.add(input.type);
      const value = [...disabled];
      await prisma.siteSetting.upsert({
        where: { key: "property_types.disabled" },
        create: { key: "property_types.disabled", value, editorId: ctx.user.id },
        update: { value, editorId: ctx.user.id },
      });
      return { type: input.type, enabled: input.enabled };
    }),

  teamMembers: adminProcedure
    .input(
      z.object({
        role: roleSchema.optional(),
        search: searchSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const where: any = {
        role: { in: STAFF_ROLES },
      };

      if (input.role) {
        where.role = input.role;
      }
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return prisma.user.findMany({
        where,
        select: {
          ...safeUserSelect,
          supervisorId: true,
          supervisor: { select: { id: true, name: true } },
        },
        orderBy: { joined: "desc" },
      });
    }),

  // Assign (or clear) a sales rep's supervisor. Pass supervisorId: null to clear.
  assignSupervisor: adminProcedure
    .input(z.object({ userId: cuidSchema, supervisorId: cuidSchema.nullable() }))
    .mutation(async ({ input }) => {
      const rep = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });
      if (!rep) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (rep.role !== "sales") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only sales reps can be assigned a supervisor." });
      }
      if (input.supervisorId) {
        const sup = await prisma.user.findUnique({
          where: { id: input.supervisorId },
          select: { id: true, role: true },
        });
        if (!sup || sup.role !== "supervisor") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selected supervisor is invalid." });
        }
      }
      await prisma.user.update({
        where: { id: input.userId },
        data: { supervisorId: input.supervisorId },
      });
      return { ok: true };
    }),

  createTeamMember: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        role: staffRoleSchema,
        city: geoTextSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [existingEmail, existingPhone] = await Promise.all([
        prisma.user.findUnique({ where: { email: input.email } }),
        prisma.user.findUnique({ where: { phone: input.phone } }),
      ]);

      if (existingEmail) throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
      if (existingPhone) throw new TRPCError({ code: "CONFLICT", message: "Phone already registered." });

      const passwordHash = await bcrypt.hash(input.password, 12);

      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          city: input.city,
          passwordHash,
          verified: true,
          verifiedAt: new Date(),
        },
        select: safeUserSelect,
      });
    }),

  // Edit a staff member's profile fields. Role changes stay super-admin-only (updateRole above).
  updateTeamMember: adminProcedure
    .input(
      z.object({
        userId: cuidSchema,
        name: nameSchema.optional(),
        email: emailSchema.optional(),
        phone: phoneSchema.optional(),
        city: geoTextSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, ...data } = input;
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (!STAFF_ROLES.includes(target.role)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only staff accounts can be edited here." });
      }
      if (target.role === "super-admin" && ctx.user.role !== "super-admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a super-admin can edit a super-admin's profile." });
      }

      if (data.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== userId) throw new TRPCError({ code: "CONFLICT", message: "Email already in use." });
      }
      if (data.phone) {
        const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
        if (existing && existing.id !== userId) throw new TRPCError({ code: "CONFLICT", message: "Phone already in use." });
      }

      return prisma.user.update({ where: { id: userId }, data, select: safeUserSelect });
    }),

  // Activate / deactivate a staff account. Deactivated staff are blocked at login
  // (auth.ts) and on every subsequent request (protectedProcedure in server.ts).
  setTeamMemberActive: adminProcedure
    .input(z.object({ userId: cuidSchema, active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't deactivate your own account." });
      }
      const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (!STAFF_ROLES.includes(target.role)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only staff accounts can be toggled here." });
      }
      if (target.role === "super-admin" && ctx.user.role !== "super-admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a super-admin can deactivate a super-admin." });
      }

      return prisma.user.update({
        where: { id: input.userId },
        data: { active: input.active },
        select: safeUserSelect,
      });
    }),

  // ── Agent directory management ──────────────────────────────────────────
  // Agents are role:"agent" users whose public directory fields live in
  // `metadata` (mirrors the seed). They surface on /agents automatically.
  adminAgents: adminProcedure
    .input(z.object({ search: searchSchema.optional() }).optional())
    .query(async ({ input }) => {
      const search = input?.search;
      return prisma.user.findMany({
        where: {
          role: "agent",
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          avatar: true,
          slug: true,
          verified: true,
          active: true,
          joined: true,
          metadata: true,
        },
        orderBy: { joined: "desc" },
      });
    }),

  createAgent: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema,
        password: passwordSchema,
        city: geoTextSchema,
        avatar: safeUrlSchema.optional(),
        rating: z.number().min(0).max(5).optional(),
        deals: z.number().int().min(0).max(100000).optional(),
        since: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
        responseTime: safeString(40).optional(),
        portfolioValue: safeString(40).optional(),
        color: safeString(40).optional(),
        featured: z.boolean().optional(),
        specialties: z.array(safeString(60)).max(12).optional(),
        languages: z.array(safeString(40)).max(12).optional(),
        cities: z.array(safeString(60)).max(12).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [existingEmail, existingPhone] = await Promise.all([
        prisma.user.findUnique({ where: { email: input.email } }),
        prisma.user.findUnique({ where: { phone: input.phone } }),
      ]);
      if (existingEmail) throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
      if (existingPhone) throw new TRPCError({ code: "CONFLICT", message: "Phone already registered." });

      const passwordHash = await bcrypt.hash(input.password, 12);
      const slug = await uniqueAgentSlug(input.name);

      const metadata = {
        initials: agentInitials(input.name),
        rating: input.rating ?? 5,
        reviews: 0,
        deals: input.deals ?? 0,
        since: input.since ?? new Date().getFullYear(),
        listings: 0,
        featured: input.featured ?? false,
        color: input.color || "bg-accent",
        responseTime: input.responseTime || "< 24 hrs",
        portfolioValue: input.portfolioValue || "—",
        specialties: input.specialties ?? [],
        languages: input.languages ?? [],
        cities: input.cities?.length ? input.cities : [input.city],
      };

      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: "agent",
          city: input.city,
          avatar: input.avatar || null,
          slug,
          passwordHash,
          verified: true,
          verifiedAt: new Date(),
          metadata,
        },
        select: { id: true, name: true, slug: true },
      });
    }),

  updateAgent: adminProcedure
    .input(
      z.object({
        userId: cuidSchema,
        name: nameSchema.optional(),
        email: emailSchema.optional(),
        phone: phoneSchema.optional(),
        city: geoTextSchema.optional(),
        avatar: safeUrlSchema.optional(),
        rating: z.number().min(0).max(5).optional(),
        deals: z.number().int().min(0).max(100000).optional(),
        since: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
        responseTime: safeString(40).optional(),
        portfolioValue: safeString(40).optional(),
        color: safeString(40).optional(),
        featured: z.boolean().optional(),
        specialties: z.array(safeString(60)).max(12).optional(),
        languages: z.array(safeString(40)).max(12).optional(),
        cities: z.array(safeString(60)).max(12).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true, metadata: true, name: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found." });
      if (target.role !== "agent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This account is not an agent." });
      }

      if (input.email) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });
        if (existing && existing.id !== input.userId)
          throw new TRPCError({ code: "CONFLICT", message: "Email already in use." });
      }
      if (input.phone) {
        const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
        if (existing && existing.id !== input.userId)
          throw new TRPCError({ code: "CONFLICT", message: "Phone already in use." });
      }

      // Merge only the profile fields that were provided into the existing
      // metadata, so partial edits don't wipe untouched directory fields.
      const meta = (target.metadata ?? {}) as Record<string, unknown>;
      const profileKeys = [
        "rating",
        "deals",
        "since",
        "responseTime",
        "portfolioValue",
        "color",
        "featured",
        "specialties",
        "languages",
        "cities",
      ] as const;
      const nextMeta: Record<string, unknown> = { ...meta };
      for (const k of profileKeys) {
        if (input[k] !== undefined) nextMeta[k] = input[k];
      }
      if (input.name) nextMeta.initials = agentInitials(input.name);

      return prisma.user.update({
        where: { id: input.userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.avatar !== undefined && { avatar: input.avatar || null }),
          // Cast the merged bag to a concrete JSON-value shape — Prisma's input
          // type rejects a plain Record<string, unknown>. Agent metadata is flat.
          metadata: nextMeta as Record<string, string | number | boolean | string[]>,
        },
        select: { id: true, name: true, slug: true },
      });
    }),

  setAgentActive: adminProcedure
    .input(z.object({ userId: cuidSchema, active: z.boolean() }))
    .mutation(async ({ input }) => {
      const target = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found." });
      if (target.role !== "agent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This account is not an agent." });
      }
      return prisma.user.update({
        where: { id: input.userId },
        data: { active: input.active },
        select: { id: true, active: true },
      });
    }),

  // ── View-boost controls ────────────────────────────────────────────────
  // List properties with their real + boosted view counts for admin control
  viewBoostList: adminProcedure
    .input(z.object({ search: searchSchema.optional(), limit: limitSchema }))
    .query(async ({ input }) => {
      const { search, limit } = input;
      const props = await prisma.property.findMany({
        where: {
          deletedAt: null,
          ...(search
            ? {
                OR: [
                  { title: { contains: search, mode: "insensitive" } },
                  { location: { locality: { contains: search, mode: "insensitive" } } },
                  { location: { city: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          title: true,
          views: true,
          viewBase: true,
          location: { select: { city: true, locality: true } },
        },
        orderBy: [{ viewBase: "desc" }, { views: "desc" }],
        take: limit,
      });
      return props;
    }),

  // Set the viewBase (social-proof boost) for a property
  setViewBase: adminProcedure
    .input(z.object({ propertyId: cuidSchema, base: z.number().int().min(0).max(9_999_999) }))
    .mutation(async ({ input }) => {
      await prisma.property.update({
        where: { id: input.propertyId },
        data: { viewBase: input.base },
      });
      return { ok: true };
    }),

  // Reset viewBase and real views for a property
  resetViews: adminProcedure
    .input(z.object({ propertyId: cuidSchema }))
    .mutation(async ({ input }) => {
      await prisma.property.update({
        where: { id: input.propertyId },
        data: { viewBase: 0, views: 0 },
      });
      return { ok: true };
    }),

  // ── Review moderation ──────────────────────────────────────────────────
  reviews: router({
    list: adminProcedure
      .input(
        z.object({
          cursor: cursorSchema,
          limit: limitSchema,
          propertyId: cuidSchema.optional(),
          rating: z.number().int().min(1).max(5).optional(),
          status: z.enum(["Pending", "Approved", "Declined"]).optional(),
        }),
      )
      .query(async ({ input }) => {
        const { cursor, limit, propertyId, rating, status } = input;
        const where: NonNullable<Parameters<typeof prisma.review.findMany>[0]>["where"] = {};
        if (propertyId) where.propertyId = propertyId;
        if (rating) where.rating = rating;
        if (status) where.status = status;

        const items = await prisma.review.findMany({
          where,
          include: {
            author: { select: { id: true, name: true, email: true, avatar: true } },
            property: { select: { id: true, title: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
      }),

    delete: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const review = await prisma.review.findUnique({ where: { id: input.id } });
        if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });
        await prisma.review.delete({ where: { id: input.id } });
        return { ok: true };
      }),

    moderate: adminProcedure
      .input(
        z.object({
          id: cuidSchema,
          status: z.enum(["Approved", "Declined"]),
          title: safeString(100, 3).optional(),
          content: safeString(1000).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const review = await prisma.review.findUnique({ where: { id: input.id } });
        if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });
        return prisma.review.update({
          where: { id: input.id },
          data: {
            status: input.status,
            ...(input.title !== undefined && { title: input.title }),
            ...(input.content !== undefined && { content: input.content }),
          },
        });
      }),

    create: adminProcedure
      .input(
        z.object({
          propertyId: cuidSchema,
          rating: ratingSchema,
          title: safeString(100, 3),
          content: safeString(1000).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const property = await prisma.property.findFirst({
          where: { id: input.propertyId, deletedAt: null },
        });
        if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found." });

        // Admin can upsert: update existing review rather than erroring
        const existing = await prisma.review.findFirst({
          where: { propertyId: input.propertyId, authorId: ctx.user.id },
        });
        if (existing) {
          return prisma.review.update({
            where: { id: existing.id },
            data: { rating: input.rating, title: input.title, content: input.content ?? null },
          });
        }
        return prisma.review.create({
          data: {
            propertyId: input.propertyId,
            authorId: ctx.user.id,
            rating: input.rating,
            title: input.title,
            content: input.content,
          },
        });
      }),
  }),

  // Home Interiors — interior design company directory, admin-managed like Builders.
  interiorDesigners: router({
    list: adminProcedure
      .input(
        z.object({
          search: searchSchema.optional(),
          status: z.enum(["pending", "active", "inactive"]).optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }): Promise<unknown> => {
        const { search, status, cursor, limit } = input;
        const where: NonNullable<Parameters<typeof prisma.interiorDesigner.findMany>[0]>["where"] = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { companyName: { contains: search, mode: "insensitive" } },
            { city:        { contains: search, mode: "insensitive" } },
            { phone:       { contains: search } },
          ];
        }
        const items = await prisma.interiorDesigner.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        const total = cursor ? null : await prisma.interiorDesigner.count({ where });
        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return {
          items: page.map((d) => ({ ...d, startingBudget: d.startingBudget != null ? Number(d.startingBudget) : null })),
          nextCursor: page.at(-1)?.id ?? null,
          hasMore,
          total,
        };
      }),

    create: adminProcedure
      .input(
        z.object({
          companyName: safeString(200, 1),
          city: geoTextSchema,
          state: geoTextSchema.optional(),
          description: safeString(5000).optional(),
          logo: safeString(500).optional(),
          coverImage: safeString(500).optional(),
          areasServed: amenitiesSchema.optional(),
          yearsExperience: z.number().int().min(0).max(100).optional(),
          projectsCompleted: z.number().int().min(0).max(100_000).optional(),
          startingBudget: z.number().int().positive().max(999_999_999_999).optional(),
          designStyles: amenitiesSchema.optional(),
          servicesOffered: amenitiesSchema.optional(),
          portfolioImages: safeUrlArraySchema.optional(),
          portfolioVideos: safeUrlArraySchema.optional(),
          virtualTourUrl: safeString(500).optional(),
          walkthroughVideoUrl: safeString(500).optional(),
          workingHours: safeString(120).optional(),
          website: safeString(300).optional(),
          phone: phoneSchema,
          email: emailSchema.optional(),
        }),
      )
      .mutation(async ({ input }): Promise<unknown> => {
        const base = makeInteriorDesignerSlug(`${input.companyName}-${input.city}`);
        let slug = base;
        let n = 2;
        while (await prisma.interiorDesigner.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

        const { startingBudget, ...rest } = input;
        const created = await prisma.interiorDesigner.create({
          data: {
            ...rest,
            slug,
            startingBudget: startingBudget != null ? BigInt(startingBudget) : null,
          },
        });
        return serializeBudget(created);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: cuidSchema,
          companyName: safeString(200, 1).optional(),
          city: geoTextSchema.optional(),
          state: geoTextSchema.optional(),
          description: safeString(5000).optional(),
          logo: safeString(500).optional(),
          coverImage: safeString(500).optional(),
          areasServed: amenitiesSchema.optional(),
          yearsExperience: z.number().int().min(0).max(100).optional(),
          projectsCompleted: z.number().int().min(0).max(100_000).optional(),
          startingBudget: z.number().int().positive().max(999_999_999_999).optional(),
          designStyles: amenitiesSchema.optional(),
          servicesOffered: amenitiesSchema.optional(),
          portfolioImages: safeUrlArraySchema.optional(),
          portfolioVideos: safeUrlArraySchema.optional(),
          virtualTourUrl: safeString(500).optional(),
          walkthroughVideoUrl: safeString(500).optional(),
          workingHours: safeString(120).optional(),
          website: safeString(300).optional(),
          phone: phoneSchema.optional(),
          email: emailSchema.optional(),
        }),
      )
      .mutation(async ({ input }): Promise<unknown> => {
        const { id, startingBudget, ...rest } = input;
        const designer = await prisma.interiorDesigner.findUnique({ where: { id } });
        if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });
        const updated = await prisma.interiorDesigner.update({
          where: { id },
          data: {
            ...rest,
            ...(startingBudget !== undefined && { startingBudget: BigInt(startingBudget) }),
          },
        });
        return serializeBudget(updated);
      }),

    // Approve & publish (verified badge + goes live) or send back to pending/inactive.
    setStatus: adminProcedure
      .input(z.object({ id: cuidSchema, status: z.enum(["pending", "active", "inactive"]) }))
      .mutation(async ({ input }): Promise<unknown> => {
        const designer = await prisma.interiorDesigner.findUnique({ where: { id: input.id } });
        if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });
        const updated = await prisma.interiorDesigner.update({
          where: { id: input.id },
          data: {
            status: input.status,
            ...(input.status === "active" && { verified: true }),
          },
        });
        return serializeBudget(updated);
      }),

    delete: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const designer = await prisma.interiorDesigner.findUnique({ where: { id: input.id } });
        if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });
        await prisma.interiorDesigner.delete({ where: { id: input.id } });
        return { ok: true };
      }),

    // Contact-unlock events — the designer's "lead" dashboard (spec §Lead Management).
    leads: adminProcedure
      .input(z.object({ designerId: cuidSchema.optional(), limit: z.number().int().min(1).max(200).default(50) }))
      .query(async ({ input }) => {
        const rows = await prisma.interiorDesignerView.findMany({
          where: { contactUnlocked: true, ...(input.designerId && { designerId: input.designerId }) },
          include: {
            designer: { select: { id: true, companyName: true, city: true } },
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
        return rows.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          designer: r.designer,
          lead: r.user ? { name: r.user.name, email: r.user.email, phone: r.user.phone } : null,
        }));
      }),
  }),

  // Decors — home decor / furnishing store directory, admin-managed like Home Interiors.
  decorStores: router({
    list: adminProcedure
      .input(
        z.object({
          search: searchSchema.optional(),
          status: z.enum(["pending", "active", "inactive"]).optional(),
          cursor: cursorSchema,
          limit: limitSchema,
        }),
      )
      .query(async ({ input }): Promise<unknown> => {
        const { search, status, cursor, limit } = input;
        const where: NonNullable<Parameters<typeof prisma.decorStore.findMany>[0]>["where"] = {};
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { companyName: { contains: search, mode: "insensitive" } },
            { city:        { contains: search, mode: "insensitive" } },
            { phone:       { contains: search } },
          ];
        }
        const items = await prisma.decorStore.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        const total = cursor ? null : await prisma.decorStore.count({ where });
        const hasMore = items.length > limit;
        const page = hasMore ? items.slice(0, limit) : items;
        return {
          items: page.map((d) => ({ ...d, startingBudget: d.startingBudget != null ? Number(d.startingBudget) : null })),
          nextCursor: page.at(-1)?.id ?? null,
          hasMore,
          total,
        };
      }),

    create: adminProcedure
      .input(
        z.object({
          companyName: safeString(200, 1),
          city: geoTextSchema,
          state: geoTextSchema.optional(),
          description: safeString(5000).optional(),
          logo: safeString(500).optional(),
          coverImage: safeString(500).optional(),
          areasServed: amenitiesSchema.optional(),
          yearsExperience: z.number().int().min(0).max(100).optional(),
          projectsCompleted: z.number().int().min(0).max(100_000).optional(),
          startingBudget: z.number().int().positive().max(999_999_999_999).optional(),
          decorCategories: amenitiesSchema.optional(),
          servicesOffered: amenitiesSchema.optional(),
          portfolioImages: safeUrlArraySchema.optional(),
          portfolioVideos: safeUrlArraySchema.optional(),
          workingHours: safeString(120).optional(),
          website: safeString(300).optional(),
          phone: phoneSchema,
          email: emailSchema.optional(),
        }),
      )
      .mutation(async ({ input }): Promise<unknown> => {
        const base = makeDecorStoreSlug(`${input.companyName}-${input.city}`);
        let slug = base;
        let n = 2;
        while (await prisma.decorStore.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

        const { startingBudget, ...rest } = input;
        const created = await prisma.decorStore.create({
          data: {
            ...rest,
            slug,
            startingBudget: startingBudget != null ? BigInt(startingBudget) : null,
          },
        });
        return serializeBudget(created);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: cuidSchema,
          companyName: safeString(200, 1).optional(),
          city: geoTextSchema.optional(),
          state: geoTextSchema.optional(),
          description: safeString(5000).optional(),
          logo: safeString(500).optional(),
          coverImage: safeString(500).optional(),
          areasServed: amenitiesSchema.optional(),
          yearsExperience: z.number().int().min(0).max(100).optional(),
          projectsCompleted: z.number().int().min(0).max(100_000).optional(),
          startingBudget: z.number().int().positive().max(999_999_999_999).optional(),
          decorCategories: amenitiesSchema.optional(),
          servicesOffered: amenitiesSchema.optional(),
          portfolioImages: safeUrlArraySchema.optional(),
          portfolioVideos: safeUrlArraySchema.optional(),
          workingHours: safeString(120).optional(),
          website: safeString(300).optional(),
          phone: phoneSchema.optional(),
          email: emailSchema.optional(),
        }),
      )
      .mutation(async ({ input }): Promise<unknown> => {
        const { id, startingBudget, ...rest } = input;
        const store = await prisma.decorStore.findUnique({ where: { id } });
        if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
        const updated = await prisma.decorStore.update({
          where: { id },
          data: {
            ...rest,
            ...(startingBudget !== undefined && { startingBudget: BigInt(startingBudget) }),
          },
        });
        return serializeBudget(updated);
      }),

    // Approve & publish (verified badge + goes live) or send back to pending/inactive.
    setStatus: adminProcedure
      .input(z.object({ id: cuidSchema, status: z.enum(["pending", "active", "inactive"]) }))
      .mutation(async ({ input }): Promise<unknown> => {
        const store = await prisma.decorStore.findUnique({ where: { id: input.id } });
        if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
        const updated = await prisma.decorStore.update({
          where: { id: input.id },
          data: {
            status: input.status,
            ...(input.status === "active" && { verified: true }),
          },
        });
        return serializeBudget(updated);
      }),

    delete: adminProcedure
      .input(z.object({ id: cuidSchema }))
      .mutation(async ({ input }) => {
        const store = await prisma.decorStore.findUnique({ where: { id: input.id } });
        if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
        await prisma.decorStore.delete({ where: { id: input.id } });
        return { ok: true };
      }),

    // Contact-unlock events — the store's "lead" dashboard (mirrors interiorDesigners.leads).
    leads: adminProcedure
      .input(z.object({ storeId: cuidSchema.optional(), limit: z.number().int().min(1).max(200).default(50) }))
      .query(async ({ input }) => {
        const rows = await prisma.decorStoreView.findMany({
          where: { contactUnlocked: true, ...(input.storeId && { storeId: input.storeId }) },
          include: {
            store: { select: { id: true, companyName: true, city: true } },
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
        return rows.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          store: r.store,
          lead: r.user ? { name: r.user.name, email: r.user.email, phone: r.user.phone } : null,
        }));
      }),
  }),
});
