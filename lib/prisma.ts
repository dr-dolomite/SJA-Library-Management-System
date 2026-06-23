import "server-only";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 connects at runtime through a driver adapter. We point the pg pool
// at the pooled (transaction-mode) Supabase URL; the pool is created lazily,
// so this module is safe to import in tooling where DATABASE_URL is absent.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse a single PrismaClient across hot-reloads in dev to avoid exhausting
// connections. In prod a fresh instance per server is fine.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
