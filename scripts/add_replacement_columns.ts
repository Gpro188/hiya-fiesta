import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding replacedFromChest and replacementNote columns if not exist...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Candidate" 
    ADD COLUMN IF NOT EXISTS "replacedFromChest" TEXT,
    ADD COLUMN IF NOT EXISTS "replacementNote" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ProgramAssignment" 
    ADD COLUMN IF NOT EXISTS "replacedFromChest" TEXT,
    ADD COLUMN IF NOT EXISTS "replacementNote" TEXT;
  `);

  console.log("✅ Successfully added replacedFromChest and replacementNote columns!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
