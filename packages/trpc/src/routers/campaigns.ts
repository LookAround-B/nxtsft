import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, adminProcedure } from "../server.js";
import { safeString } from "../sanitize.js";

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
        id: z.string(),
        status: z.enum(["draft", "scheduled", "active", "paused", "completed"]),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
