import { NextRequest } from "next/server";
import prisma from "@nxtsft/db";

export async function getAuthUser(req: NextRequest) {
  const raw = req.headers.get("authorization") ?? "";
  if (!raw.startsWith("Bearer ")) return null;

  const token = raw.slice(7);
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || session.expiresAt < new Date()) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

// Recursively converts BigInt values to numbers for JSON serialization
export function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInt(v)]),
    );
  }
  return obj;
}
