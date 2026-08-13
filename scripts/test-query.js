const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.program.count({ where: { eventId: 'a78585de-a07d-4572-bda5-3ddc8fa8dac2' } });
  console.log('Programs count for this event:', count);
  
  const pgms = await prisma.program.findMany({ where: { eventId: 'a78585de-a07d-4572-bda5-3ddc8fa8dac2' }});
  console.log('Programs detail:', pgms);
}
main().finally(() => process.exit(0));
