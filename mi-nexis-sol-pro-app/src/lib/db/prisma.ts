import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Standard Next.js dev-mode Prisma singleton — prevents exhausting the
 * Postgres connection pool from hot-reload creating a new PrismaClient on
 * every file save.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
