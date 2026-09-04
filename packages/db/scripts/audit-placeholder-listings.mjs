/**
 * Read-only audit: which live listings are showing category placeholder artwork
 * instead of real photos (the bulk-import fallback at properties.ts CATEGORY_IMAGE).
 *
 * Usage:  node packages/db/scripts/audit-placeholder-listings.mjs [--csv]
 * Writes nothing. --csv prints a repair-template to stdout.
 *
 * Lives under packages/db so @prisma/client and the pg adapter resolve; it
 * builds its own client rather than importing client.ts (that file is TS).
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

const CATEGORY_IMAGES = [
  "/categories/apartment.png", "/categories/studio.png", "/categories/villa.png",
  "/categories/commercial.png", "/categories/plot.png", "/categories/pg.png",
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const asCsv = process.argv.includes("--csv");

const rows = await prisma.property.findMany({
  where: { deletedAt: null, images: { hasSome: CATEGORY_IMAGES } },
  select: {
    id: true, slug: true, title: true, type: true, status: true, images: true,
    createdAt: true, ownerName: true,
    owner: { select: { name: true, phone: true, metadata: true } },
    location: { select: { city: true, locality: true } },
  },
  orderBy: { createdAt: "asc" },
});

// Only placeholders, no real photo at all — vs. rows that have both.
const placeholderOnly = rows.filter((r) => r.images.every((i) => CATEGORY_IMAGES.includes(i)));
const mixed = rows.filter((r) => !r.images.every((i) => CATEGORY_IMAGES.includes(i)));

if (asCsv) {
  const esc = (v) => (/[",\n]/.test(v ?? "") ? `"${String(v).replace(/"/g, '""')}"` : (v ?? ""));
  console.log("Property ID,Slug,Title,City,Owner,Created,Image URLs");
  for (const r of placeholderOnly) {
    console.log([
      r.id, r.slug, r.title, r.location?.city, r.ownerName ?? r.owner?.name,
      r.createdAt.toISOString().slice(0, 10), "",
    ].map(esc).join(","));
  }
} else {
  const total = await prisma.property.count({ where: { deletedAt: null } });
  console.log(`Live listings: ${total}`);
  console.log(`Placeholder-only (no real photo): ${placeholderOnly.length}`);
  console.log(`Mixed (placeholder + real photos): ${mixed.length}\n`);

  const byBatch = new Map();
  for (const r of placeholderOnly) {
    const day = r.createdAt.toISOString().slice(0, 10);
    byBatch.set(day, (byBatch.get(day) ?? 0) + 1);
  }
  console.log("By import date:");
  for (const [day, n] of [...byBatch].sort()) console.log(`  ${day}  ${n}`);

  const bulkOwners = placeholderOnly.filter(
    (r) => r.owner?.metadata && JSON.stringify(r.owner.metadata).includes("admin-bulk-upload"),
  ).length;
  console.log(`\nOf those, owned by an admin-bulk-created account: ${bulkOwners}`);

  console.log("\nFirst 30:");
  for (const r of placeholderOnly.slice(0, 30)) {
    console.log(
      `  ${r.createdAt.toISOString().slice(0, 10)}  ${r.status.padEnd(8)} ${String(r.type).padEnd(10)} ` +
      `${(r.location?.city ?? "?").padEnd(12)} ${r.title.slice(0, 44).padEnd(46)} /properties/${r.slug}`,
    );
  }
  if (placeholderOnly.length > 30) console.log(`  …and ${placeholderOnly.length - 30} more`);
}

await prisma.$disconnect();
await pool.end();
