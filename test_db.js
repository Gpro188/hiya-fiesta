require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasources: {
    db: { url: process.env.PG_DATABASE_URL }
  }
});

async function run() {
  const start = Date.now();
  console.log("Connecting to Supabase pooler...");
  const userCount = await p.user.count();
  console.log("Success! User count:", userCount, "Time taken:", Date.now() - start, "ms");
  await p.$disconnect();
}

run().catch(err => {
  console.error("Error connecting:", err);
  process.exit(1);
});
