const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: 'mdw' }
  });
  
  if (!user.institutionId) return console.log('No institution ID');

  const students = await prisma.masterStudent.findMany({
    where: { institutionId: user.institutionId }
  });
  
  console.log(Found  students for MDW.);
  console.log('Sample student:', students[0]);
}
main();
