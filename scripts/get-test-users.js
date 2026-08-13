const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const zoneAdmin = await prisma.user.findFirst({
    where: { role: 'ZONE_ADMIN' }
  });
  
  const manager = await prisma.user.findFirst({
    where: { role: 'MANAGER' }
  });

  console.log('Zone Admin:', zoneAdmin.username);
  console.log('Manager:', manager.username);
}

main();
