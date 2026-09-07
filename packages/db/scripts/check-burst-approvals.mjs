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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// The 03:31-03:40 UTC burst on 2026-09-07.
const from = new Date("2026-09-07T03:00:00.000Z");
const to = new Date("2026-09-07T04:00:00.000Z");

const burst = await prisma.property.findMany({
  where: { updatedAt: { gte: from, lte: to }, status: "Active", deletedAt: null },
  select: { id: true, title: true, source: true, rera: true, freeListing: true },
  orderBy: { updatedAt: "asc" },
});

const bySource = {};
const noRera = { withRera: 0, withoutRera: 0 };
for (const p of burst) {
  bySource[p.source] = (bySource[p.source] ?? 0) + 1;
  if (p.rera) noRera.withRera++;
  else noRera.withoutRera++;
}
console.log(`approved in burst window: ${burst.length}`);
console.log("by source:", bySource);
console.log("rera:", noRera);
console.log("\nself-sourced (the ones only approvable via the manual freeListing hack):");
for (const p of burst.filter((p) => p.source === "self")) {
  console.log(`  ${p.id}  rera=${p.rera ?? "—"}  ${p.title.slice(0, 60)}`);
}

await prisma.$disconnect();
await pool.end();
