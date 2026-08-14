// @ts-nocheck
import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client-postgres';
import fs from 'fs';

const sqlite = new SQLiteClient();
const pg = new PostgresClient();

async function main() {
  console.log("Starting verification between SQLite and PostgreSQL...");

  const tables = [
    { name: "Zone", sqliteGet: sqlite.zone.count, pgGet: pg.zone.count },
    { name: "GlobalSetting", sqliteGet: sqlite.globalSetting.count, pgGet: pg.globalSetting.count },
    { name: "HomepageSetting", sqliteGet: sqlite.homepageSetting.count, pgGet: pg.homepageSetting.count },
    { name: "Event", sqliteGet: sqlite.event.count, pgGet: pg.event.count },
    { name: "Category", sqliteGet: sqlite.category.count, pgGet: pg.category.count },
    { name: "MasterInstitution", sqliteGet: sqlite.masterInstitution.count, pgGet: pg.masterInstitution.count },
    { name: "MasterStudent", sqliteGet: sqlite.masterStudent.count, pgGet: pg.masterStudent.count },
    { name: "Team", sqliteGet: sqlite.team.count, pgGet: pg.team.count },
    { name: "Program", sqliteGet: sqlite.program.count, pgGet: pg.program.count },
    { name: "User", sqliteGet: sqlite.user.count, pgGet: pg.user.count },
    { name: "Candidate", sqliteGet: sqlite.candidate.count, pgGet: pg.candidate.count },
    { name: "ProgramAssignment", sqliteGet: sqlite.programAssignment.count, pgGet: pg.programAssignment.count },
    { name: "Result", sqliteGet: sqlite.result.count, pgGet: pg.result.count },
    { name: "PointMatrix", sqliteGet: sqlite.pointMatrix.count, pgGet: pg.pointMatrix.count },
    { name: "StateQualification", sqliteGet: sqlite.stateQualification.count, pgGet: pg.stateQualification.count },
    { name: "MediaTemplate", sqliteGet: sqlite.mediaTemplate.count, pgGet: pg.mediaTemplate.count },
    { name: "PageVisit", sqliteGet: sqlite.pageVisit.count, pgGet: pg.pageVisit.count },
    { name: "SystemAuditLog", sqliteGet: sqlite.systemAuditLog.count, pgGet: pg.systemAuditLog.count },
    { name: "ContactMessage", sqliteGet: sqlite.contactMessage.count, pgGet: pg.contactMessage.count }
  ];

  let markdown = `# ARTFEST CLOUD DATABASE VERIFICATION\n\n`;
  markdown += `| TABLE | SQLITE ROWS | POSTGRES ROWS | STATUS |\n`;
  markdown += `| --- | --- | --- | --- |\n`;

  let allMatch = true;

  for (const table of tables) {
    const sqliteCount = await table.sqliteGet();
    const pgCount = await table.pgGet();
    const status = sqliteCount === pgCount ? 'PASS ✅' : 'FAIL ❌';
    if (sqliteCount !== pgCount) allMatch = false;

    markdown += `| ${table.name} | ${sqliteCount} | ${pgCount} | ${status} |\n`;
    console.log(`${table.name}: SQLite=${sqliteCount}, Postgres=${pgCount} -> ${status}`);
  }

  // Count Implicit M2M tables
  const sqliteEventJudges = await sqlite.$queryRaw\`SELECT count(*) as count FROM "_EventJudges"\`;
  const pgEventJudges = await pg.$queryRaw\`SELECT count(*) as count FROM "_EventJudges"\`;
  const sqliteEjCount = Number((sqliteEventJudges as any)[0].count);
  const pgEjCount = Number((pgEventJudges as any)[0].count);
  const ejStatus = sqliteEjCount === pgEjCount ? 'PASS ✅' : 'FAIL ❌';
  if (sqliteEjCount !== pgEjCount) allMatch = false;
  markdown += `| _EventJudges | ${sqliteEjCount} | ${pgEjCount} | ${ejStatus} |\n`;
  console.log(`_EventJudges: SQLite=${sqliteEjCount}, Postgres=${pgEjCount} -> ${ejStatus}`);

  const sqliteProgramJudges = await sqlite.$queryRaw\`SELECT count(*) as count FROM "_ProgramJudges"\`;
  const pgProgramJudges = await pg.$queryRaw\`SELECT count(*) as count FROM "_ProgramJudges"\`;
  const sqlitePjCount = Number((sqliteProgramJudges as any)[0].count);
  const pgPjCount = Number((pgProgramJudges as any)[0].count);
  const pjStatus = sqlitePjCount === pgPjCount ? 'PASS ✅' : 'FAIL ❌';
  if (sqlitePjCount !== pgPjCount) allMatch = false;
  markdown += `| _ProgramJudges | ${sqlitePjCount} | ${pgPjCount} | ${pjStatus} |\n`;
  console.log(`_ProgramJudges: SQLite=${sqlitePjCount}, Postgres=${pgPjCount} -> ${pjStatus}`);

  fs.writeFileSync('ARTFEST_CLOUD_DATABASE_VERIFICATION.md', markdown);
  console.log("Verification report written to ARTFEST_CLOUD_DATABASE_VERIFICATION.md");

  if (!allMatch) {
    console.error("WARNING: Row count mismatch detected!");
    process.exit(1);
  } else {
    console.log("SUCCESS: All tables match exactly.");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await sqlite.$disconnect();
    await pg.$disconnect();
  });
