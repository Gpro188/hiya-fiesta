import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  let url = process.env.PG_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
  
  // If connecting to postgres pooler, ensure optimal connection limit and timeout
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    if (url.includes("6543") || url.includes("pgbouncer=true") || url.includes("pooler.supabase.com")) {
      // Ensure connect_timeout and pool_timeout are set generously so concurrent queries don't crash
      if (!url.includes("connect_timeout")) {
        url += (url.includes("?") ? "&" : "?") + "connect_timeout=30";
      }
      if (!url.includes("pool_timeout")) {
        url += (url.includes("?") ? "&" : "?") + "pool_timeout=30";
      }
      // Replace connection_limit=1 or any small limit with connection_limit=20 to support concurrent requests
      if (url.includes("connection_limit=")) {
        url = url.replace(/connection_limit=\d+/g, "connection_limit=20");
      } else {
        url += (url.includes("?") ? "&" : "?") + "connection_limit=20";
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

// Always cache client on globalThis to prevent spawning multiple connection pools in PM2 / Node.js
globalForPrisma.prisma = prisma;

