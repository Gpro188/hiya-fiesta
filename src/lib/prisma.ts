import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  let url = process.env.PG_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
  
  // Ensure optimal connection limit and timeout for all PostgreSQL connections
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    if (!url.includes("connect_timeout")) {
      url += (url.includes("?") ? "&" : "?") + "connect_timeout=30";
    }
    if (!url.includes("pool_timeout")) {
      url += (url.includes("?") ? "&" : "?") + "pool_timeout=30";
    }
    if (url.includes("connection_limit=")) {
      url = url.replace(/connection_limit=\d+/g, "connection_limit=25");
    } else {
      url += (url.includes("?") ? "&" : "?") + "connection_limit=25";
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

