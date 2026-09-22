import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@nxtsft/db";
import { router, publicProcedure, adminProcedure, contactRateLimit } from "../server";
import { safeString, nameSchema, emailSchema, phoneSchema, cuidSchema, isSafeUrl } from "../sanitize";
import { notifyAdmins } from "../notify";

// Careers (#14). Job postings are admin-managed content stored in the SiteSetting
// key "careers.jobs" (same pattern as home.hero / home.banners); applications are
// rows in JobApplication. `listJobs` is public (the careers page reads it);
// everything that touches applications or edits postings is admin-only.
const JOBS_KEY = "careers.jobs";

const jobSchema = z.object({
  id: safeString(64, 1),
  title: safeString(160, 1),
  location: safeString(120).optional(),
  type: safeString(40).optional(), // Full-time | Part-time | Contract | Internship
  department: safeString(80).optional(),
  description: safeString(4000).optional(),
});

const APPLICATION_STATUS = z.enum(["New", "Shortlisted", "Rejected", "Hired"]);

export const careersRouter = router({
  // Public: the open positions shown on the careers page. Return type pinned to
  // `unknown` so Prisma's JsonValue doesn't trip tRPC's client inference (same
  // guard as siteContentRouter).
  listJobs: publicProcedure.query(async (): Promise<unknown> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: JOBS_KEY } });
    return (row?.value ?? { jobs: [] }) as unknown;
  }),

  // Admin: replace the open positions list wholesale (the manager sends the full
  // array — add/edit/reorder/remove all round-trip through one save).
  setJobs: adminProcedure
    .input(z.object({ jobs: z.array(jobSchema).max(50) }))
    .mutation(async ({ input, ctx }): Promise<unknown> => {
      const row = await prisma.siteSetting.upsert({
        where: { key: JOBS_KEY },
        create: { key: JOBS_KEY, value: { jobs: input.jobs }, editorId: ctx.user.id },
        update: { value: { jobs: input.jobs }, editorId: ctx.user.id },
      });
      return row.value;
    }),

  // Public: submit an application. Rate-limited (5/hour/IP) since it's an
  // unauthenticated write. A résumé is required as either an uploaded PDF
  // (media.uploadResume → our own R2 URL) or a pasted external link.
  // (Named submitApplication, not "apply" — tRPC reserves `apply`.)
  submitApplication: publicProcedure
    .use(contactRateLimit)
    .input(
      z.object({
        jobId: safeString(64).optional(),
        jobTitle: safeString(160, 1),
        name: nameSchema,
        email: emailSchema,
        phone: phoneSchema.optional(),
        message: safeString(2000).optional(),
        resumeUrl: z.string().url().max(2000).optional(), // from media.uploadResume
        resumeLink: z.string().url().max(2000).optional(), // user-pasted
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.resumeUrl && !input.resumeLink) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please attach a résumé — upload a PDF or paste a link.",
        });
      }
      // resumeUrl is minted by our own uploadResume, so it's trusted. resumeLink
      // is user input — reject javascript:/data:/internal-host URLs.
      if (input.resumeLink && !isSafeUrl(input.resumeLink)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That résumé link isn't a valid public URL.",
        });
      }

      const app = await prisma.jobApplication.create({
        data: {
          jobId: input.jobId ?? null,
          jobTitle: input.jobTitle,
          name: input.name,
          email: input.email,
          phone: input.phone,
          message: input.message,
          resumeUrl: input.resumeUrl,
          resumeLink: input.resumeLink,
        },
      });

      await notifyAdmins({
        type: "job_application",
        title: "New job application",
        content: `${input.name} applied for "${input.jobTitle}".`,
        hash: "careers",
      });

      return { ok: true, id: app.id };
    }),

  // Admin: review applications (optionally filtered by status).
  listApplications: adminProcedure
    .input(z.object({ status: APPLICATION_STATUS.optional() }).optional())
    .query(async ({ input }) => {
      return prisma.jobApplication.findMany({
        where: input?.status ? { status: input.status } : {},
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    }),

  // Admin: move an application through the pipeline.
  setApplicationStatus: adminProcedure
    .input(z.object({ id: cuidSchema, status: APPLICATION_STATUS }))
    .mutation(async ({ input }) => {
      await prisma.jobApplication.update({
        where: { id: input.id },
        data: { status: input.status },
      });
      return { ok: true };
    }),
});
