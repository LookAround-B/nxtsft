/**
 * One-shot: revert the self-serve listings that were only approvable because
 * `freeListing` had been flipped to true by hand (bypassing the RERA gate).
 * freeListing was already reset to false by fix-freelisting-mismatch.mjs;
 * this puts them back in the review queue.
 *
 * Scoped by explicit id list — NOT by a time window, because the freeListing
 * fix bumped updatedAt on these rows.
 *
 *   node packages/db/scripts/revert-hacked-approvals.mjs          # dry run
 *   node packages/db/scripts/revert-hacked-approvals.mjs --write  # apply
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
      dotenv.config({ path: envPath, quiet: true });
      if (process.env.DATABASE_URL) break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

// The 13 rows that were Active in fix-freelisting-mismatch.mjs's output.
const IDS = [
  "cmtmj8ul5000404kvp3m1ehxg",
  "cmtmn138a000204jph5mftn88",
  "cmtmni91u000a04jpbzqnxs84",
  "cmtmnus7f000k04jp5ekddruv",
  "cmtmqn1l3000204la6fdp5xse",
  "cmtmsy9ar000504jrbv41ir9y",
  "cmtmudmwr000f04jrfvmsx7p8",
  "cmtmvvsag000404jpnnwmr2dv",
  "cmtmvy2rz000204leq7v3blro",
  "cmtmwonfl000e04jp0yxklo42",
  "cmtmww93k000c04lekxtvhikb",
  "cmtmxq0hb000204lgm6pttxn0",
  "cmtmy58eg000o04jpvqa0ura1",
];

const write = process.argv.includes("--write");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Guard: only touch rows that are still Active + self-sourced + not free.
const rows = await prisma.property.findMany({
  where: { id: { in: IDS }, status: "Active", source: "self", freeListing: false, deletedAt: null },
  select: { id: true, title: true, status: true, source: true, rera: true, freeListing: true },
});

console.log(`${rows.length} of ${IDS.length} rows match the guard (Active + self + freeListing=false)`);
for (const r of rows) console.log(`  ${r.id}  rera=${r.rera ?? "—"}  ${r.title.slice(0, 60)}`);

const skipped = IDS.filter((id) => !rows.some((r) => r.id === id));
if (skipped.length) console.log(`\nskipped (did not match guard): ${skipped.join(", ")}`);

if (!write) {
  console.log("\nDry run — re-run with --write to apply.");
} else {
  const { count } = await prisma.property.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { status: "Pending" },
  });
  console.log(`\nUpdated ${count} rows → status = Pending`);
}

await prisma.$disconnect();
await pool.end();
