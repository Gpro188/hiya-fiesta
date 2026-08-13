const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'MANAGER' }
  });
  console.log('Total Managers:', users.length);
  
  const mdw = await prisma.user.findFirst({
    where: { username: 'mdw' },
    include: { institution: true, zone: true }
  });
  console.log('mdw user:', JSON.stringify(mdw, null, 2));
}

main();
