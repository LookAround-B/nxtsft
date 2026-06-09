import { PrismaClient } from "@prisma/client";
export { PrismaClient };

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  const globalRef = global as any;
  if (!globalRef.prisma) {
    globalRef.prisma = new PrismaClient();
  }
  prisma = globalRef.prisma;
}

export default prisma;
