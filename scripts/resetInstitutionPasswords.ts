import { prisma } from "../src/lib/prisma";
import bcrypt from "bcrypt";

async function main() {
  console.log("Starting institution password reset to '123'...");
  const hashedPassword = await bcrypt.hash("123", 10);

  // 1. Update all MasterInstitution records
  const instResult = await prisma.masterInstitution.updateMany({
    data: { password: "123" }
  });
  console.log(`Updated ${instResult.count} MasterInstitution passwords to '123'.`);

  // 2. Update all INSTITUTION_MANAGER User accounts
  const userResult = await prisma.user.updateMany({
    where: { role: { in: ["INSTITUTION_MANAGER", "MANAGER"] } },
    data: { password: hashedPassword }
  });
  console.log(`Updated ${userResult.count} Institution Manager User accounts to '123'.`);

  // 3. Also check if any MasterInstitution has no User account and create it
  const allInstitutions = await prisma.masterInstitution.findMany({
    include: { users: true }
  });

  let createdAccounts = 0;
  for (const inst of allInstitutions) {
    if (inst.users.length === 0) {
      const username = inst.code.trim().toLowerCase();
      await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          institutionId: inst.id,
          zoneId: inst.zoneId,
          role: "INSTITUTION_MANAGER"
        }
      });
      createdAccounts++;
    }
  }

  console.log(`Created ${createdAccounts} missing user accounts for institutions.`);
  console.log("Password reset completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error resetting passwords:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
