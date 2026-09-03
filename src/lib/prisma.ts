import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  let url = process.env.PG_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
  
  // If connecting to postgres pooler, ensure optimal connection limit and timeout
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    if (url.includes("pooler.supabase.com:6543")) {
      // Ensure connect_timeout and pool_timeout are set so requests don't hang
      if (!url.includes("connect_timeout")) {
        url += (url.includes("?") ? "&" : "?") + "connect_timeout=15&pool_timeout=15";
      }
      // Replace connection_limit=1 with connection_limit=10 to prevent concurrent queuing delays
      if (url.includes("connection_limit=1")) {
        url = url.replace("connection_limit=1", "connection_limit=10");
      }
    }
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

