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
  // max:1 prevents connection exhaustion in Vercel serverless — each function
  // instance is single-threaded so it never needs more than one connection.
  // connectionTimeoutMillis ensures a hung DB surfaces as a fast error rather
  // than a 30-second Vercel function timeout.
  const pool = new pg.Pool({
    connectionString,
    max: 1,
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
