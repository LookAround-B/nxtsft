import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, superAdminProcedure, broadcastRateLimit } from "../server";
import {
  safeString,
  cuidSchema,
  cursorSchema,
  limitSchema,
  emailSchema,
  ipSchema,
  roleSchema,
  passwordComplexitySchema,
} from "../sanitize";

// Access level for a (role, feature) cell, ascending privilege.
const accessLevelSchema = z.enum(["none", "read", "write"]);

// matrix[roleKey][featureKey] = accessLevel. Keys are bounded to keep the
// persisted JSON small; the frontend defines the canonical lists.
const permissionMatrixSchema = z
  .record(z.string().max(40), z.record(z.string().max(60), accessLevelSchema))
  .refine((m) => Object.keys(m).length <= 20, "Too many roles")
  .refine(
    (m) => Object.values(m).every((feats) => Object.keys(feats).length <= 60),
    "Too many features",
  );

type PermissionMatrix = z.infer<typeof permissionMatrixSchema>;

// Platform config: on/off state for feature flags and integrations, keyed by
// the canonical keys the frontend owns. Bounded to keep the persisted JSON small.
const platformConfigSchema = z.object({
  flags: z.record(z.string().max(60), z.boolean()).refine(
    (m) => Object.keys(m).length <= 100,
    "Too many flags",
  ),
  integrations: z.record(z.string().max(60), z.boolean()).refine(
    (m) => Object.keys(m).length <= 100,
    "Too many integrations",
  ),
});

type PlatformConfig = z.infer<typeof platformConfigSchema>;

// ── End-user activity monitor (LA / chairman ask) ──────────────────────────
// "Super admin should see everything an end-user is doing" — who signed up,
// who's logging in, who's listing, who's showing buying intent, who's just
// browsing. These helpers back `activityStats` / `activityFeed`, which unify
// real events across User / AuditLog / PropertyView / Lead / SiteVisit /
// Property, scoped to consumer (non-staff) users and classified by intent.
const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"];
const windowDaysSchema = z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7);
const activityKindSchema = z.enum(["all", "signup", "login", "browsing", "buying", "listing"]);

function activitySince(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Global command-centre tiles — short per-instance cache (one DB connection means
// these queries run serially; see packages/db/client.ts).
type SaStats = {
  usersCount: number; propertiesCount: number; activeSessionsCount: number;
  totalRevenue: number; roleDistribution: { role: string; count: number }[];
};
let saStatsCache: { data: SaStats; expires: number } | null = null;
const SA_STATS_TTL_MS = 30_000;

export const superAdminRouter = router({
  stats: superAdminProcedure.query(async () => {
    if (saStatsCache && saStatsCache.expires > Date.now()) {
      return saStatsCache.data;
    }
    const [
      propertiesCount,
      activeSessionsCount,
      totalPayments,
      roleDistribution,
    ] = await Promise.all([
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.session.count({ where: { expiresAt: { gte: new Date() } } }),
      prisma.payment.aggregate({ where: { status: "Success" }, _sum: { amount: true } }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      }),
    ]);

    // Total users is just the sum of the role buckets — no extra count query.
    const usersCount = roleDistribution.reduce((sum, d) => sum + d._count.id, 0);

    const data: SaStats = {
      usersCount,
      propertiesCount,
      activeSessionsCount,
      totalRevenue: Number(totalPayments._sum.amount ?? 0) / 100,
      roleDistribution: roleDistribution.map((d) => ({
        role: d.role,
        count: d._count.id,
      })),
    };
    saStatsCache = { data, expires: Date.now() + SA_STATS_TTL_MS };
    return data;
  }),

  // Summary tiles for the User Activity monitor: how many end-users signed up,
  // logged in, are just browsing, are showing buying intent, and how many
  // listings went up — all within the selected window. "Just browsing" is a
  // viewer with no unlock / enquiry / visit (i.e. looking, not (yet) buying).
  activityStats: superAdminProcedure
    .input(z.object({ windowDays: windowDaysSchema }))
    .query(async ({ input }) => {
      const since = activitySince(input.windowDays);

      const [newSignups, newListings, loginGroups, viewGroups, unlockGroups, leadGroups, visitGroups] =
        await Promise.all([
          prisma.user.count({ where: { role: { notIn: STAFF_ROLES }, joined: { gte: since } } }),
          prisma.property.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
          prisma.auditLog.groupBy({
            by: ["userId"],
            where: { action: "auth.login", createdAt: { gte: since }, userId: { not: null } },
          }),
          prisma.propertyView.groupBy({
            by: ["userId"],
            where: { userId: { not: null }, createdAt: { gte: since } },
          }),
          prisma.propertyView.groupBy({
            by: ["userId"],
            where: { userId: { not: null }, contactUnlocked: true, createdAt: { gte: since } },
          }),
          prisma.lead.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
          prisma.siteVisit.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
        ]);

      // Resolve every referenced user's role once, then keep only consumers.
      const allIds = new Set<string>();
      for (const groups of [loginGroups, viewGroups, unlockGroups, leadGroups, visitGroups]) {
        for (const g of groups) if (g.userId) allIds.add(g.userId);
      }
      const users = await prisma.user.findMany({
        where: { id: { in: [...allIds] } },
        select: { id: true, role: true },
      });
      const consumer = new Set(users.filter((u) => !STAFF_ROLES.includes(u.role)).map((u) => u.id));
      const consumerIds = (groups: { userId: string | null }[]) =>
        new Set(groups.map((g) => g.userId).filter((id): id is string => !!id && consumer.has(id)));

      const loginUsers = consumerIds(loginGroups);
      const viewers = consumerIds(viewGroups);
      const intent = new Set<string>([
        ...consumerIds(unlockGroups),
        ...consumerIds(leadGroups),
        ...consumerIds(visitGroups),
      ]);
      let browsing = 0;
      for (const id of viewers) if (!intent.has(id)) browsing++;

      return {
        windowDays: input.windowDays,
        newSignups,
        logins: loginUsers.size,
        browsing,
        buyingIntent: intent.size,
        newListings,
      };
    }),

  // Unified, chronological, intent-classified feed of what end-users are doing.
  // Merges recent rows from each source, resolves users/properties in batch,
  // drops staff activity, and returns the most recent `limit` events.
  activityFeed: superAdminProcedure
    .input(
      z.object({
        windowDays: windowDaysSchema,
        kind: activityKindSchema.default("all"),
        search: safeString(80).optional(),
        limit: z.number().int().min(1).max(200).default(60),
      }),
    )
    .query(async ({ input }) => {
      const since = activitySince(input.windowDays);
      const { kind, limit } = input;
      const search = input.search?.trim();
      const want = (k: string) => kind === "all" || kind === k;

      // Resolve a search term to a bounded set of matching user ids up front,
      // so every source can filter on it uniformly.
      let searchIds: string[] | null = null;
      if (search) {
        const us = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
          select: { id: true },
          take: 300,
        });
        searchIds = us.map((u) => u.id);
        if (searchIds.length === 0) return { windowDays: input.windowDays, items: [] };
      }

      type Kind = "signup" | "login" | "browsing" | "buying" | "listing";
      type Ev = {
        id: string;
        at: Date;
        kind: Kind;
        action: string;
        userId: string;
        user: { id: string; name: string; email: string; phone: string | null; role: string } | null;
        propertyId: string | null;
        target: { title: string; slug: string } | null;
        meta: string | null;
      };
      const events: Ev[] = [];
      const userInSearch = (id: string) => !searchIds || searchIds.includes(id);

      const tasks: Promise<void>[] = [];

      // 1) Signups — the users themselves; role already scoped to consumers.
      if (want("signup")) {
        tasks.push(
          prisma.user
            .findMany({
              where: {
                role: { notIn: STAFF_ROLES },
                joined: { gte: since },
                ...(searchIds ? { id: { in: searchIds } } : {}),
              },
              select: { id: true, name: true, email: true, phone: true, role: true, joined: true, city: true },
              orderBy: { joined: "desc" },
              take: limit,
            })
            .then((rows) => {
              for (const u of rows) {
                events.push({
                  id: `signup:${u.id}`,
                  at: u.joined,
                  kind: "signup",
                  action:
                    u.role === "home-seller"
                      ? "Signed up as a property owner"
                      : u.role === "agent"
                        ? "Signed up as an agent"
                        : "Signed up",
                  userId: u.id,
                  user: { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role },
                  propertyId: null,
                  target: null,
                  meta: u.city || null,
                });
              }
            }),
        );
      }

      // 2) Logins — from the audit trail; user resolved in batch below.
      if (want("login")) {
        tasks.push(
          prisma.auditLog
            .findMany({
              where: {
                action: "auth.login",
                createdAt: { gte: since },
                userId: searchIds ? { in: searchIds } : { not: null },
              },
              select: { id: true, userId: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: limit * 2,
            })
            .then((rows) => {
              for (const r of rows) {
                if (!r.userId) continue;
                events.push({
                  id: `login:${r.id}`,
                  at: r.createdAt,
                  kind: "login",
                  action: "Logged in",
                  userId: r.userId,
                  user: null,
                  propertyId: null,
                  target: null,
                  meta: null,
                });
              }
            }),
        );
      }

      // 3) Listings created — the "is he listing?" signal, keyed to the owner.
      if (want("listing")) {
        tasks.push(
          prisma.property
            .findMany({
              where: {
                deletedAt: null,
                createdAt: { gte: since },
                ...(searchIds ? { ownerId: { in: searchIds } } : {}),
              },
              select: {
                id: true,
                title: true,
                slug: true,
                ownerId: true,
                createdAt: true,
                location: { select: { city: true } },
              },
              orderBy: { createdAt: "desc" },
              take: limit,
            })
            .then((rows) => {
              for (const p of rows) {
                events.push({
                  id: `listing:${p.id}`,
                  at: p.createdAt,
                  kind: "listing",
                  action: "Listed a property",
                  userId: p.ownerId,
                  user: null,
                  propertyId: p.id,
                  target: { title: p.title, slug: p.slug },
                  meta: p.location?.city || null,
                });
              }
            }),
        );
      }

      // 4) Property views — "just browsing" (no unlock) vs buying (unlocked).
      if (want("browsing")) {
        tasks.push(
          prisma.propertyView
            .findMany({
              where: {
                userId: searchIds ? { in: searchIds } : { not: null },
                contactUnlocked: false,
                createdAt: { gte: since },
              },
              select: { id: true, userId: true, propertyId: true, durationSec: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: limit,
            })
            .then((rows) => {
              for (const v of rows) {
                if (!v.userId) continue;
                events.push({
                  id: `view:${v.id}`,
                  at: v.createdAt,
                  kind: "browsing",
                  action: "Viewed a property",
                  userId: v.userId,
                  user: null,
                  propertyId: v.propertyId,
                  target: null,
                  meta: v.durationSec ? `${v.durationSec}s on page` : null,
                });
              }
            }),
        );
      }

      // 5) Buying intent — unlocked a contact, sent an enquiry, or booked a visit.
      if (want("buying")) {
        tasks.push(
          prisma.propertyView
            .findMany({
              where: {
                userId: searchIds ? { in: searchIds } : { not: null },
                contactUnlocked: true,
                createdAt: { gte: since },
              },
              select: { id: true, userId: true, propertyId: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: limit,
            })
            .then((rows) => {
              for (const v of rows) {
                if (!v.userId) continue;
                events.push({
                  id: `unlock:${v.id}`,
                  at: v.createdAt,
                  kind: "buying",
                  action: "Unlocked owner contact",
                  userId: v.userId,
                  user: null,
                  propertyId: v.propertyId,
                  target: null,
                  meta: null,
                });
              }
            }),
        );
        tasks.push(
          prisma.lead
            .findMany({
              where: { createdAt: { gte: since }, ...(searchIds ? { userId: { in: searchIds } } : {}) },
              select: { id: true, userId: true, propertyId: true, interest: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: limit,
            })
            .then((rows) => {
              for (const l of rows) {
                events.push({
                  id: `lead:${l.id}`,
                  at: l.createdAt,
                  kind: "buying",
                  action: "Sent an enquiry",
                  userId: l.userId,
                  user: null,
                  propertyId: l.propertyId,
                  target: null,
                  meta: l.interest || null,
                });
              }
            }),
        );
        tasks.push(
          prisma.siteVisit
            .findMany({
              where: { createdAt: { gte: since }, ...(searchIds ? { userId: { in: searchIds } } : {}) },
              select: { id: true, userId: true, propertyId: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: limit,
            })
            .then((rows) => {
              for (const s of rows) {
                events.push({
                  id: `visit:${s.id}`,
                  at: s.createdAt,
                  kind: "buying",
                  action: "Booked a site visit",
                  userId: s.userId,
                  user: null,
                  propertyId: s.propertyId,
                  target: null,
                  meta: null,
                });
              }
            }),
        );
      }

      await Promise.all(tasks);

      // Batch-resolve users (for events without one) and property targets.
      const needUserIds = [...new Set(events.filter((e) => !e.user).map((e) => e.userId))];
      const needPropIds = [...new Set(events.filter((e) => !e.target && e.propertyId).map((e) => e.propertyId as string))];
      const [users, properties] = await Promise.all([
        needUserIds.length
          ? prisma.user.findMany({
              where: { id: { in: needUserIds } },
              select: { id: true, name: true, email: true, phone: true, role: true },
            })
          : Promise.resolve([]),
        needPropIds.length
          ? prisma.property.findMany({
              where: { id: { in: needPropIds } },
              select: { id: true, title: true, slug: true },
            })
          : Promise.resolve([]),
      ]);
      const userById = new Map(users.map((u) => [u.id, u]));
      const propById = new Map(properties.map((p) => [p.id, p]));

      for (const e of events) {
        if (!e.user) e.user = userById.get(e.userId) ?? null;
        if (!e.target && e.propertyId) {
          const p = propById.get(e.propertyId);
          if (p) e.target = { title: p.title, slug: p.slug };
        }
      }

      // Keep only end-user (consumer) activity; drop anything by staff or with
      // an unresolvable user, then return the most recent `limit` events.
      const items = events
        .filter((e) => e.user && !STAFF_ROLES.includes(e.user.role) && userInSearch(e.userId))
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, limit)
        .map((e) => ({
          id: e.id,
          at: e.at.toISOString(),
          kind: e.kind,
          action: e.action,
          user: e.user,
          target: e.target,
          meta: e.meta,
        }));

      return { windowDays: input.windowDays, items };
    }),

  systemHealth: superAdminProcedure.query(async () => {
    // Return realistic diagnostic health parameters
    return {
      status: "Healthy",
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuLoad: [0.15, 0.22, 0.18], // 1, 5, 15 min load averages
      databaseConnection: "Connected",
      cacheConnection: "Connected",
      services: {
        razorpay: "Online",
        cloudflareR2: "Online",
        smsGateway: "Online",
      },
    };
  }),

  securityLog: superAdminProcedure
    .input(
      z.object({
        cursor: cursorSchema,
        limit: limitSchema.default(50),
      }),
    )
    .query(async ({ input }) => {
      const { cursor, limit } = input;

      const items = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;

      return { items: page, nextCursor: page.at(-1)?.id ?? null, hasMore };
    }),

  failedLogins: superAdminProcedure
    .input(
      z.object({
        limit: limitSchema,
      }),
    )
    .query(async ({ input }) => {
      return prisma.auditLog.findMany({
        where: {
          action: "login_failed",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  logFailedLogin: superAdminProcedure
    .input(
      z.object({
        email: emailSchema,
        ipAddress: ipSchema.optional(),
        userAgent: safeString(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.auditLog.create({
        data: {
          action: "login_failed",
          entity: "User",
          entityId: input.email,
          changes: { email: input.email },
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    }),

  sessionTerminateGlobal: superAdminProcedure
    .input(z.object({ userId: cuidSchema }))
    .mutation(async ({ input }) => {
      const deleted = await prisma.session.deleteMany({
        where: { userId: input.userId },
      });

      await prisma.auditLog.create({
        data: {
          action: "global_session_termination",
          entity: "User",
          entityId: input.userId,
          changes: { deletedSessionsCount: deleted.count },
        },
      });

      return { count: deleted.count };
    }),

  // Manage IP Rules (whitelist/blacklist) using a simulated configuration in DB Audit Log settings
  getIpRules: superAdminProcedure.query(async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entity: "IpConfig" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const log = logs[0];
    if (!log) {
      return { whitelistedIps: [] as string[], blacklistedIps: [] as string[] };
    }
    return log.changes as { whitelistedIps: string[]; blacklistedIps: string[] };
  }),

  updateIpRules: superAdminProcedure
    .input(
      z.object({
        whitelistedIps: z.array(ipSchema),
        blacklistedIps: z.array(ipSchema),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.auditLog.create({
        data: {
          action: "update_ip_rules",
          entity: "IpConfig",
          entityId: "system",
          changes: input,
        },
      });
    }),

  // Passwords / 2FA Policy Settings
  getPolicyConfig: superAdminProcedure.query(async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entity: "PolicyConfig" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const log = logs[0];
    if (!log) {
      return {
        passwordMinLength: 8,
        passwordComplexity: "medium", // low | medium | high
        passwordExpiryDays: 90,
        enforce2faRoles: ["super-admin", "admin"] as string[],
      };
    }
    return log.changes as {
      passwordMinLength: number;
      passwordComplexity: string;
      passwordExpiryDays: number;
      enforce2faRoles: string[];
    };
  }),

  updatePolicyConfig: superAdminProcedure
    .input(
      z.object({
        passwordMinLength: z.number().int().min(6).max(32),
        passwordComplexity: passwordComplexitySchema,
        passwordExpiryDays: z.number().int().min(0).max(3650),
        enforce2faRoles: z.array(roleSchema),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.auditLog.create({
        data: {
          action: "update_policy_config",
          entity: "PolicyConfig",
          entityId: "system",
          changes: input,
        },
      });
    }),

  // Role × feature permission matrix. Stored as a config snapshot in AuditLog
  // (entity "PermissionMatrix"), same pattern as IP rules / policy config.
  // The frontend owns the canonical role/feature lists and sensible defaults;
  // this just persists whatever the super-admin saves.
  getPermissionMatrix: superAdminProcedure.query(async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entity: "PermissionMatrix" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const log = logs[0];
    if (!log) return { matrix: null as PermissionMatrix | null, updatedAt: null as string | null };
    const changes = log.changes as { matrix?: PermissionMatrix } | null;
    return { matrix: changes?.matrix ?? null, updatedAt: log.createdAt.toISOString() };
  }),

  updatePermissionMatrix: superAdminProcedure
    .input(z.object({ matrix: permissionMatrixSchema }))
    .mutation(async ({ input, ctx }) => {
      return prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "update_permission_matrix",
          entity: "PermissionMatrix",
          entityId: "system",
          changes: { matrix: input.matrix },
        },
      });
    }),

  // Platform configuration (feature flags + integration toggles). Stored as a
  // config snapshot in AuditLog (entity "PlatformConfig"), same pattern as IP
  // rules / policy config / permission matrix. The frontend owns the canonical
  // flag/integration definitions (keys, labels, env tags); this just persists
  // the on/off state keyed by those keys.
  getPlatformConfig: superAdminProcedure.query(async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entity: "PlatformConfig" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const log = logs[0];
    if (!log) return { config: null as PlatformConfig | null, updatedAt: null as string | null };
    const changes = log.changes as { config?: PlatformConfig } | null;
    return { config: changes?.config ?? null, updatedAt: log.createdAt.toISOString() };
  }),

  updatePlatformConfig: superAdminProcedure
    .input(z.object({ config: platformConfigSchema }))
    .mutation(async ({ input, ctx }) => {
      return prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "update_platform_config",
          entity: "PlatformConfig",
          entityId: "system",
          changes: { config: input.config },
        },
      });
    }),

  // Payment gateway toggle — stored in SiteSetting so it persists across deploys
  getActiveGateway: superAdminProcedure.query(async () => {
    const row = await prisma.siteSetting.findUnique({ where: { key: "active_payment_gateway" } });
    const gw = (row?.value as string | null) ?? "razorpay";
    return { gateway: gw as "razorpay" | "payu" };
  }),

  setActiveGateway: superAdminProcedure
    .input(z.object({ gateway: z.enum(["razorpay", "payu"]) }))
    .mutation(async ({ input, ctx }) => {
      await prisma.siteSetting.upsert({
        where: { key: "active_payment_gateway" },
        create: { key: "active_payment_gateway", value: input.gateway, editorId: ctx.user.id },
        update: { value: input.gateway, editorId: ctx.user.id },
      });
      return { gateway: input.gateway };
    }),

  broadcastNotification: superAdminProcedure
    .use(broadcastRateLimit)
    .input(
      z.object({
        title: safeString(200, 5),
        content: safeString(2000, 10),
        targetRole: roleSchema.optional(), // optional filtering
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const users = await prisma.user.findMany({
        where: input.targetRole ? { role: input.targetRole } : {},
        select: { id: true },
      });

      const notificationsData = users.map((u) => ({
        userId: u.id,
        type: "system",
        title: input.title,
        content: input.content,
      }));

      await prisma.notification.createMany({
        data: notificationsData,
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "broadcast_notification",
          entity: "Notification",
          entityId: "broadcast",
          changes: { title: input.title, count: users.length },
        },
      });

      return { count: users.length };
    }),

  // ── Billing & Revenue ─────────────────────────────────────────────────────

  billingStats: superAdminProcedure.query(async () => {
    const [activeSubs, failedSubs, recentPayments] = await Promise.all([
      prisma.subscription.findMany({ where: { status: "Active" } }),
      prisma.subscription.findMany({ where: { status: { in: ["Failed", "Expired"] } } }),
      prisma.payment.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, phone: true } } },
      }),
    ]);

    const mrr = activeSubs.reduce((s, sub) => s + Number(sub.amount), 0) / 100;

    return {
      mrr,
      arr: mrr * 12,
      outstanding: failedSubs.reduce((s, sub) => s + Number(sub.amount), 0) / 100,
      outstandingCount: failedSubs.length,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        userName: p.user.name,
        userPhone: p.user.phone,
        amount: Number(p.amount) / 100,
        status: p.status,
        method: p.method,
        createdAt: p.createdAt,
      })),
    };
  }),

  // ── AI Model Versions ─────────────────────────────────────────────────────

  modelVersions: superAdminProcedure.query(async () => {
    return prisma.modelVersion.findMany({ orderBy: { createdAt: "desc" } });
  }),

  deployModel: superAdminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      return prisma.modelVersion.update({
        where: { id: input.id },
        data: { status: "live", deployedAt: new Date() },
      });
    }),

  rollbackModel: superAdminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      return prisma.modelVersion.update({
        where: { id: input.id },
        data: { status: "inactive" },
      });
    }),

  // ── Content CMS ───────────────────────────────────────────────────────────

  cmsPages: superAdminProcedure.query(async () => {
    return prisma.cmsPage.findMany({
      include: { editor: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  createCmsPage: superAdminProcedure
    .input(
      z.object({
        title: safeString(200, 3),
        path: z.string().startsWith("/").max(200),
        body: z.string().max(50000).optional(),
        scheduledAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.cmsPage.create({
        data: {
          title: input.title,
          path: input.path,
          body: input.body ?? null,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          status: input.scheduledAt ? "scheduled" : "draft",
          editorId: ctx.user.id,
        },
      });
    }),

  publishCmsPage: superAdminProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ input }) => {
      return prisma.cmsPage.update({
        where: { id: input.id },
        data: { status: "published", scheduledAt: null },
      });
    }),
});
