import { z } from "zod";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure } from "../server";

// Admin-editable site content stored as key/value JSON in SiteSetting.
// `get` is public (the home page reads it); `set` is admin-only.
// Keys are namespaced, e.g. "home.hero". Values are opaque JSON validated
// per-key by the callers; we only enforce a small size ceiling here.

const KEY = z.string().min(1).max(100);

// Site-content values are small JSON blobs. Typed as `unknown` (validated by
// callers per-key) to keep tRPC's client-side type inference shallow — a
// `z.any()` here tripped TS2589 "excessively deep" on the web client.
const VALUE = z
  .unknown()
  .refine((v) => JSON.stringify(v ?? null).length <= 50_000, { message: "Content is too large." });

export const siteContentRouter = router({
  // Return type pinned to `unknown` so Prisma's recursive `JsonValue` type
  // doesn't propagate through tRPC's client inference and trip TS2589.
  get: publicProcedure.input(z.object({ key: KEY })).query(async ({ input }): Promise<unknown> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: input.key } });
    return (row?.value ?? null) as Record<string, unknown> | null;
  }),

  set: adminProcedure
    .input(
      z.object({ key: KEY, value: VALUE }),
    )
    .mutation(async ({ input, ctx }): Promise<unknown> => {
      const value = input.value as object;
      const row = await prisma.siteSetting.upsert({
        where: { key: input.key },
        create: { key: input.key, value, editorId: ctx.user.id },
        update: { value, editorId: ctx.user.id },
      });
      return row.value;
    }),
});
