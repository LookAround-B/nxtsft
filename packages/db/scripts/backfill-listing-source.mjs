/**
 * One-shot backfill for Property.source / Property.createdById on rows created
 * before those columns existed (they all default to "self").
 *
 * Heuristics, in priority order — creation-site flags first, owner metadata last:
 *   status "Test"                        → dummy        (only rep dummy listings use it)
 *   freeListing = true                   → fresh_lead   (only the Fresh Lead flow sets it)
 *   a lead links to the property AND the
 *     owner was minted by a rep          → rep_assisted (createdById = that rep)
 *   owner role is staff (admin/…)        → bulk_import  (CSV rows ride the importer's account)
 *   otherwise                            → self
 *
 * The rep for rep_assisted / fresh_lead comes from User.metadata.createdById,
 * written by findOrCreateCustomerAccount. Rows whose owner predates that (or who
 * signed up themselves) keep createdById null — the chip still shows the source.
 *
 *   node packages/db/scripts/backfill-listing-source.mjs          # dry run
 *   node packages/db/scripts/backfill-listing-source.mjs --write  # apply
 *
 * Idempotent: re-running only rewrites rows to the same values.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

// Same .env walk-up as packages/db/client.ts.
if (!process.env.DATABASE_URL) {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir && dir !== "/") {
    const envPath = join(dir, ".env");
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.DATABASE_URL) break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

const STAFF_ROLES = ["super-admin", "admin", "supervisor", "sales", "support-admin"];
const write = process.argv.includes("--write");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const rows = await prisma.property.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    title: true,
    status: true,
    freeListing: true,
    source: true,
    createdById: true,
    owner: { select: { id: true, role: true, metadata: true } },
    leads: { select: { id: true }, take: 1 },
  },
  orderBy: { createdAt: "asc" },
});

const repOf = (owner) => {
  const meta = owner?.metadata;
  if (!meta || typeof meta !== "object") return null;
  return meta.source === "sales-rep-listing" && typeof meta.createdById === "string" ? meta.createdById : null;
};

const plan = rows.map((p) => {
  const rep = repOf(p.owner);
  let source = "self";
  if (p.status === "Test") source = "dummy";
  else if (p.freeListing) source = "fresh_lead";
  else if (rep && p.leads.length > 0) source = "rep_assisted";
  else if (STAFF_ROLES.includes(p.owner?.role)) source = "bulk_import";
  const createdById = source === "self" ? null : source === "bulk_import" ? p.owner.id : rep;
  return { id: p.id, title: p.title, source, createdById, changed: p.source !== source || p.createdById !== createdById };
});

const tally = {};
for (const r of plan) tally[r.source] = (tally[r.source] ?? 0) + 1;
console.log(`\n${rows.length} listings scanned`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(13)} ${v}`);
const changes = plan.filter((r) => r.changed);
console.log(`  ${"→ to update".padEnd(13)} ${changes.length}\n`);

if (!write) {
  for (const r of changes.slice(0, 20)) console.log(`  ${r.source.padEnd(13)} ${r.title.slice(0, 60)}`);
  if (changes.length > 20) console.log(`  … and ${changes.length - 20} more`);
  console.log("\nDry run — re-run with --write to apply.");
} else {
  // Grouped by (source, createdById) so this is a handful of updateMany calls,
  // not one round trip per listing.
  const groups = new Map();
  for (const r of changes) {
    const key = `${r.source}|${r.createdById ?? ""}`;
    if (!groups.has(key)) groups.set(key, { source: r.source, createdById: r.createdById, ids: [] });
    groups.get(key).ids.push(r.id);
  }
  for (const g of groups.values()) {
    const { count } = await prisma.property.updateMany({
      where: { id: { in: g.ids } },
      data: { source: g.source, createdById: g.createdById },
    });
    console.log(`  updated ${count} → ${g.source}${g.createdById ? ` (staff ${g.createdById})` : ""}`);
  }
  console.log("\nDone.");
}

await prisma.$disconnect();
await pool.end();
