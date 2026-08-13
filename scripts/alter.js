const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fields = [
    'registrationStart',
    'registrationEnd',
    'assignmentStart',
    'assignmentEnd'
  ];

  for (const field of fields) {
    try {
      console.log(`Adding column ${field}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Event" ADD COLUMN "${field}" timestamp(3) without time zone;`);
      console.log(`Added column ${field}.`);
    } catch (e) {
      console.log(`Column ${field} might already exist:`, e.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
