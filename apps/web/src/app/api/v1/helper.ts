import { NextRequest } from "next/server";
import prisma from "@nxtsft/db";

export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    if (obj instanceof Date) return obj.toISOString();
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = serializeBigInt(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  const session = await prisma.session.findUnique({
    where: { token },
  });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return prisma.user.findUnique({
    where: { id: session.userId },
  });
}
