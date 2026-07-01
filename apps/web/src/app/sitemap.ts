import type { MetadataRoute } from "next";
import prisma from "@nxtsft/db";
import { SITE_URL } from "@/lib/site";

// Prisma (pg adapter) needs the Node runtime. Regenerate hourly via ISR so new
// listings/builders/agents surface to crawlers without a redeploy.
export const runtime = "nodejs";
export const revalidate = 3600;

// A single sitemap is capped at 50,000 URLs by the protocol. Static + property +
// agent + interior URLs stay well under; builders are bounded by a quality gate
// and this cap. If any one set ever approaches the limit, split into a chunked
// sitemap index with Next's generateSitemaps().
const MAX_URLS_PER_TYPE = 45_000;

type SlugRow = { slug: string | null; updatedAt: Date };

function detailEntries(
  rows: SlugRow[],
  prefix: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap {
  return rows
    .filter((r): r is { slug: string; updatedAt: Date } => Boolean(r.slug))
    .map((r) => ({
      url: `${SITE_URL}${prefix}/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency,
      priority,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Curated public routes. Auth, portal, and transactional paths are
  // intentionally omitted here and blocked in robots.ts.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/properties`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/builders`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/agents`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/interiors`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/pg`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/nri-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/nri-investment-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/refer`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/careers`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookie-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/fraud-advisory`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // The DB read is best-effort: a transient failure must not 500 the crawler's
  // fetch, so fall back to the static routes instead of throwing.
  try {
    const [properties, builders, agents, interiors] = await Promise.all([
      prisma.property.findMany({
        where: { status: "Active" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_URLS_PER_TYPE,
      }),
      prisma.builder.findMany({
        // Quality gate: only builders with a public slug that are verified or
        // have at least one project. Keeps thin, name-only bulk-imported rows
        // out of the index (thin/doorway pages hurt rankings) and bounds size.
        where: { slug: { not: null }, OR: [{ verified: true }, { projects: { some: {} } }] },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_URLS_PER_TYPE,
      }),
      prisma.user.findMany({
        where: { role: "agent", slug: { not: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_URLS_PER_TYPE,
      }),
      prisma.interiorDesigner.findMany({
        where: { status: "active" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_URLS_PER_TYPE,
      }),
    ]);

    return [
      ...staticEntries,
      ...detailEntries(properties, "/properties", "weekly", 0.8),
      ...detailEntries(builders, "/builders", "monthly", 0.6),
      ...detailEntries(agents, "/agents", "monthly", 0.5),
      ...detailEntries(interiors, "/interiors", "monthly", 0.5),
    ];
  } catch (err) {
    console.error("[sitemap] DB query failed; serving static routes only:", err);
    return staticEntries;
  }
}
