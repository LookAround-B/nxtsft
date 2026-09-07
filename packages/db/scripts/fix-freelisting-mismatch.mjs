/**
 * One-shot fix: freeListing=true should only ever coexist with
 * source="fresh_lead" (see properties.ts create()). 15 rows were found with
 * freeListing=true but source="self" — set manually outside app code,
 * probably via Prisma Studio, as a workaround for the old hardcoded
 * RERA-before-approval gate. Reset freeListing back to false on those rows.
 *
 *   node packages/db/scripts/fix-freelisting-mismatch.mjs          # dry run
 *   node packages/db/scripts/fix-freelisting-mismatch.mjs --write  # apply
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

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

const write = process.argv.includes("--write");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const rows = await prisma.property.findMany({
  where: { freeListing: true, source: { not: "fresh_lead" }, deletedAt: null },
  select: { id: true, title: true, source: true, status: true, rera: true },
  orderBy: { createdAt: "asc" },
});

console.log(`${rows.length} mismatched rows found (freeListing=true, source != fresh_lead)`);
for (const r of rows) console.log(`  ${r.id}  ${r.status.padEnd(8)} ${r.source.padEnd(6)} rera=${r.rera ?? "—"}  ${r.title.slice(0, 60)}`);

if (!write) {
  console.log("\nDry run — re-run with --write to apply.");
} else {
  const { count } = await prisma.property.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { freeListing: false },
  });
  console.log(`\nUpdated ${count} rows → freeListing = false`);
}

await prisma.$disconnect();
await pool.end();
