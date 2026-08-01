import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const superadminPassword = await bcrypt.hash('cswc2026', 10);

  // 1. Create Default State Festival Event
  const stateFest = await prisma.event.create({
    data: {
      name: 'CSWC Hiya Fiesta 2026 State Final',
      type: 'STATE',
    }
  });

  // 2. Create Super Admin User
  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      password: superadminPassword,
      eventId: stateFest.id,
    },
    create: {
      username: 'superadmin',
      password: superadminPassword,
      role: 'SUPER_ADMIN',
      eventId: stateFest.id,
    },
  });

  // 3. Create 8 Zones as per CSWC Manual
  const zones = [
    { name: 'MALAPPURAM EAST', code: 'MPE' },
    { name: 'MALAPPURAM WEST', code: 'MPW' },
    { name: 'PALAKKAD', code: 'PLK' },
    { name: 'THRISSUR', code: 'TCR' },
    { name: 'KARNATAKA', code: 'KAR' },
    { name: 'KANNUR', code: 'KNR' },
    { name: 'KOZHIKODE', code: 'KKD' },
    { name: 'KASARAGOD', code: 'KSG' },
  ];

  for (const z of zones) {
    const zoneObj = await prisma.zone.upsert({
      where: { code: z.code },
      update: { name: z.name },
      create: { name: z.name, code: z.code }
    });

    // Create Zone Event
    const zoneEvent = await prisma.event.create({
      data: {
        name: `CSWC Hiya Fiesta 2026 - ${z.name} Zone`,
        type: 'ZONE',
        zoneId: zoneObj.id,
        parentId: stateFest.id,
      }
    });

    // Create Zone Admin User (username: zone_mpe, pass: admin123)
    const zAdminPass = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { username: `zone_${z.code.toLowerCase()}` },
      update: { eventId: zoneEvent.id, zoneId: zoneObj.id },
      create: {
        username: `zone_${z.code.toLowerCase()}`,
        password: zAdminPass,
        role: 'ZONE_ADMIN',
        zoneId: zoneObj.id,
        eventId: zoneEvent.id,
      }
    });

    // Create 3 Categories for the Zone Event
    await prisma.category.createMany({
      data: [
        { name: 'FADHILA', chestNumberOffset: 100, eventId: zoneEvent.id },
        { name: 'FADHEELA', chestNumberOffset: 200, eventId: zoneEvent.id },
        { name: 'GENERAL', chestNumberOffset: 300, eventId: zoneEvent.id },
      ]
    });
  }

  // Create Categories for State Event
  await prisma.category.createMany({
    data: [
      { name: 'FADHILA', chestNumberOffset: 100, eventId: stateFest.id },
      { name: 'FADHEELA', chestNumberOffset: 200, eventId: stateFest.id },
      { name: 'GENERAL', chestNumberOffset: 300, eventId: stateFest.id },
    ]
  });

  console.log('CSWC Hiya Fiesta 2026 Seeding Completed Successfully!', { superadmin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
