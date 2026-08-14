// @ts-nocheck
import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client-postgres';

const sqlite = new SQLiteClient({
  datasources: {
    db: { url: 'file:../prisma/dev.db' }
  }
});
const pg = new PostgresClient();

async function main() {
  console.log("Starting migration from SQLite to PostgreSQL...");

  // Verify connection to Postgres
  try {
    await pg.$connect();
    console.log("Connected to PostgreSQL successfully.");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL. Please check your DATABASE_URL.", error);
    process.exit(1);
  }

  // Order of tables is critical to avoid foreign key constraint errors
  const tables = [
    { name: "Zone", get: sqlite.zone.findMany, set: pg.zone.createMany },
    { name: "Event", get: sqlite.event.findMany, set: pg.event.createMany },
    { name: "GlobalSetting", get: sqlite.globalSetting.findMany, set: pg.globalSetting.createMany },
    { name: "HomepageSetting", get: sqlite.homepageSetting.findMany, set: pg.homepageSetting.createMany },
    { name: "Category", get: sqlite.category.findMany, set: pg.category.createMany },
    { name: "MasterInstitution", get: sqlite.masterInstitution.findMany, set: pg.masterInstitution.createMany },
    { name: "MasterStudent", get: sqlite.masterStudent.findMany, set: pg.masterStudent.createMany },
    { name: "Team", get: sqlite.team.findMany, set: pg.team.createMany },
    { name: "Program", get: sqlite.program.findMany, set: pg.program.createMany },
    { name: "User", get: sqlite.user.findMany, set: pg.user.createMany },
    { name: "Candidate", get: sqlite.candidate.findMany, set: pg.candidate.createMany },
    { name: "ProgramAssignment", get: sqlite.programAssignment.findMany, set: pg.programAssignment.createMany },
    { name: "Result", get: sqlite.result.findMany, set: pg.result.createMany },
    { name: "PointMatrix", get: sqlite.pointMatrix.findMany, set: pg.pointMatrix.createMany },
    { name: "StateQualification", get: sqlite.stateQualification.findMany, set: pg.stateQualification.createMany },
    { name: "MediaTemplate", get: sqlite.mediaTemplate.findMany, set: pg.mediaTemplate.createMany },
    { name: "PageVisit", get: sqlite.pageVisit.findMany, set: pg.pageVisit.createMany },
    { name: "SystemAuditLog", get: sqlite.systemAuditLog.findMany, set: pg.systemAuditLog.createMany },
    { name: "ContactMessage", get: sqlite.contactMessage.findMany, set: pg.contactMessage.createMany }
  ];

  for (const table of tables) {
    console.log(`Migrating ${table.name}...`);
    const data = await table.get();
    if (data.length > 0) {
      try {
        await table.set({ data, skipDuplicates: true });
        console.log(` -> Migrated ${data.length} records.`);
      } catch (err: any) {
        console.error(` -> Error migrating ${table.name}:`, err.message);
      }
    } else {
      console.log(` -> 0 records found.`);
    }
  }

  // Handle implicit Many-to-Many relations
  console.log("Migrating _EventJudges...");
  const usersWithJudgingEvents = await sqlite.user.findMany({
    where: { judgingEvents: { some: {} } },
    include: { judgingEvents: true }
  });
  let eventJudgesCount = 0;
  for (const user of usersWithJudgingEvents) {
    for (const ev of user.judgingEvents) {
      await pg.$executeRaw`INSERT INTO "_EventJudges" ("A", "B") VALUES (${ev.id}, ${user.id}) ON CONFLICT DO NOTHING`;
      eventJudgesCount++;
    }
  }
  console.log(` -> Migrated ${eventJudgesCount} _EventJudges links.`);

  console.log("Migrating _ProgramJudges...");
  const usersWithProgramJudges = await sqlite.user.findMany({
    where: { assignedPrograms: { some: {} } },
    include: { assignedPrograms: true }
  });
  let programJudgesCount = 0;
  for (const user of usersWithProgramJudges) {
    for (const prog of user.assignedPrograms) {
      await pg.$executeRaw`INSERT INTO "_ProgramJudges" ("A", "B") VALUES (${prog.id}, ${user.id}) ON CONFLICT DO NOTHING`;
      programJudgesCount++;
    }
  }
  console.log(` -> Migrated ${programJudgesCount} _ProgramJudges links.`);

  console.log("Migration completed safely without touching SQLite data.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await sqlite.$disconnect();
    await pg.$disconnect();
  });
