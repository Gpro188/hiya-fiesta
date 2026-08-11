const bcrypt = require('bcrypt'); 
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function check() { 
  const u = await prisma.user.findUnique({where:{username:'superadmin'}}); 
  const match = await bcrypt.compare('cswc2026', u.password); 
  console.log('Match cswc2026?', match); 
} 

check().finally(() => prisma.$disconnect());
