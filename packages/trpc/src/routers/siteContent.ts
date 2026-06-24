import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure } from "../server.js";

// Admin-editable site content stored as key/value JSON in SiteSetting.
// `get` is public (the home page reads it); `set` is admin-only.
// Keys are namespaced, e.g. "home.hero". Values are opaque JSON validated
// per-key by the callers; we only enforce a small size ceiling here.

const KEY = z.string().min(1).max(100);

export const siteContentRouter = router({
  get: publicProcedure.input(z.object({ key: KEY })).query(async ({ input }) => {
    const row = await prisma.siteSetting.findUnique({ where: { key: input.key } });
    return (row?.value ?? null) as Record<string, unknown> | null;
  }),

  set: adminProcedure
    .input(
      z.object({
        key: KEY,
        // Cap serialized size so a single setting can't bloat the row.
        value: z.any().refine((v) => JSON.stringify(v ?? null).length <= 50_000, {
          message: "Content is too large.",
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const row = await prisma.siteSetting.upsert({
        where: { key: input.key },
        create: { key: input.key, value: input.value, editorId: ctx.user.id },
        update: { value: input.value, editorId: ctx.user.id },
      });
      return row.value;
    }),
});
