require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testUrl(name, url) {
  console.log(`\nTesting ${name}...`);
  const client = new PrismaClient({
    datasources: { db: { url } }
  });
  const start = Date.now();
  try {
    const count = await client.user.count();
    console.log(`[SUCCESS] ${name} connected in ${Date.now() - start}ms. Count: ${count}`);
  } catch (err) {
    console.error(`[FAILED] ${name} error in ${Date.now() - start}ms:`, err.message);
  } finally {
    await client.$disconnect();
  }
}

async function run() {
  await testUrl("Current PG_DATABASE_URL (port 6543 connection_limit=1)", process.env.PG_DATABASE_URL);
  
  const pooler10 = process.env.PG_DATABASE_URL.replace("connection_limit=1", "connection_limit=10&connect_timeout=15");
  await testUrl("Pooler port 6543 with limit 10", pooler10);

  const directUrl = process.env.PG_DIRECT_URL;
  await testUrl("Direct port 5432 (Session Mode)", directUrl);
}

run();
