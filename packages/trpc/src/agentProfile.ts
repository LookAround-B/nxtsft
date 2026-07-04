/**
 * Shared helpers for creating agent (role:"agent") directory profiles — used by
 * both admin-created agents and self-service agent registrations so the two
 * paths produce identical records.
 */
import prisma from "@nxtsft/db";

export function agentInitials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Name → URL slug (e.g. "Fatima Sheikh" → "fatima-sheikh"), disambiguated with a
// numeric suffix if the slug is already taken.
export async function uniqueAgentSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "agent";
  let slug = base;
  let n = 2;
  while (await prisma.user.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// Sensible starting directory fields for a brand-new agent. Admin can refine
// them later via the Edit Agent tool.
export function defaultAgentMetadata(name: string, city: string) {
  return {
    initials: agentInitials(name),
    rating: 5,
    reviews: 0,
    deals: 0,
    since: new Date().getFullYear(),
    listings: 0,
    featured: false,
    color: "bg-accent",
    responseTime: "< 24 hrs",
    portfolioValue: "—",
    specialties: [] as string[],
    languages: [] as string[],
    cities: [city],
  };
}
