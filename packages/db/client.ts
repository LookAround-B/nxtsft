import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export { PrismaClient };

function loadEnv() {
  if (process.env.DATABASE_URL) return;

  // 1. Walk up from current file location (e.g. packages/db/client.ts)
  try {
    const __filename = fileURLToPath(import.meta.url);
    let dir = dirname(__filename);
    while (dir && dir !== "/") {
      const envPath = join(dir, ".env");
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.DATABASE_URL) return;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch (e) {}

  // 2. Walk up from process.cwd()
  try {
    let dir = process.cwd();
    while (dir && dir !== "/") {
      const envPath = join(dir, ".env");
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.DATABASE_URL) return;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch (e) {}
}

function createPrismaClient() {
  loadEnv();
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
  // Pool sizing is per function instance. The old max:1 assumed one request
  // per instance, which stopped being true under Vercel Fluid Compute — an
  // instance now serves many requests concurrently, so a single connection
  // turns every concurrent request into a queue behind it and one slow query
  // fails all of them with "timeout exceeded when trying to connect".
  //
  // POOL_MAX is deliberately small anyway: the Postgres behind this is shared
  // (max_connections=100, other databases on the same server), so the budget
  // is instances x POOL_MAX, not requests x anything. Raise it only alongside
  // a real pooler (PgBouncer in transaction mode) in front of the database.
  //
  // connectionTimeoutMillis keeps a hung DB surfacing as a fast error rather
  // than a 30-second Vercel function timeout.
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX) || 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 8_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  const globalRef = global as any;
  if (!globalRef.prisma) {
    globalRef.prisma = createPrismaClient();
  }
  prisma = globalRef.prisma;
}

export default prisma;
