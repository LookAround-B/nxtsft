import prisma from "@nxtsft/db";

type Ctx = { user: { id: string; role: string } };
export const SALES_REP_ROLES = ["sales", "virtual-rep"] as const;
export const isSalesRep = (role: string) => SALES_REP_ROLES.includes(role as (typeof SALES_REP_ROLES)[number]);

/** Roles that see every team's data, unscoped. */
const UNSCOPED_ROLES = ["admin", "super-admin", "support-admin"];

/**
 * Sales reps attributed to this supervisor (User.supervisorId).
 * Empty for any other role.
 */
export async function teamRepIds(ctx: Ctx): Promise<string[]> {
  if (ctx.user.role !== "supervisor") return [];
  const reps = await prisma.user.findMany({
    where: { supervisorId: ctx.user.id, role: { in: [...SALES_REP_ROLES] } },
    select: { id: true },
  });
  return reps.map((r) => r.id);
}

/**
 * Lead `where` clause for the signed-in staff user.
 * sales      → own leads
 * supervisor → leads routed to them plus anything held by their own reps
 * admin/SA   → everything
 */
export async function leadScope(ctx: Ctx) {
  if (isSalesRep(ctx.user.role)) return { assignedToId: ctx.user.id };
  if (ctx.user.role === "supervisor") {
    const repIds = await teamRepIds(ctx);
    return {
      OR: [
        { supervisorId: ctx.user.id },
        ...(repIds.length ? [{ assignedToId: { in: repIds } }] : []),
      ],
    };
  }
  return {};
}

/**
 * `where` clause for rows keyed by a sales rep id (site visits, activity).
 * Supervisors are limited to their own reps; a supervisor with no reps yet
 * matches nothing rather than everything.
 */
export async function repScope(ctx: Ctx, field: string) {
  if (isSalesRep(ctx.user.role)) return { [field]: ctx.user.id };
  if (ctx.user.role === "supervisor") return { [field]: { in: await teamRepIds(ctx) } };
  return {};
}

export const seesAllTeams = (role: string) => UNSCOPED_ROLES.includes(role);
