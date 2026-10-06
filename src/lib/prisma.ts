// Safe Prisma Client singleton with offline/fallback resilience

const DEFAULT_DB_URL =
  "postgresql://postgres.wafeaoqxmdxemhynvbjn:DuvalCoffee2026%21@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

let prismaClientInstance: any = null;

try {
  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const prismaPkg = require("@prisma/client");
    if (prismaPkg && prismaPkg.PrismaClient) {
      const globalForPrisma = globalThis as unknown as { prisma?: any };
      const dbUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;
      prismaClientInstance =
        globalForPrisma.prisma ??
        new prismaPkg.PrismaClient({
          datasources: {
            db: { url: dbUrl },
          },
          log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
        });
      if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClientInstance;
    }
  }
} catch (e) {
  console.warn("Prisma Client init fallback safe catch:", e);
  prismaClientInstance = null;
}

export const prisma: any = prismaClientInstance;
