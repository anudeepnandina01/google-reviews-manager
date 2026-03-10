import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Prisma client optimized for serverless (Vercel)
 * 
 * In production: Uses connection pooling via DATABASE_URL (PgBouncer)
 * In development: Direct connection with query logging
 * 
 * The global singleton pattern prevents connection exhaustion during
 * hot module reloading in development.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Datasource URL is configured in schema.prisma via DATABASE_URL env var
    // which should point to PgBouncer (port 6543) for connection pooling
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
