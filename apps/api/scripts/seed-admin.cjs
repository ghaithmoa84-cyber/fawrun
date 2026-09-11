const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('adminpass123', 12);
  
  // Create admin user
  await prisma.user.create({
    data: {
      id: 'admin-test-id',
      whatsapp: '96300000001',
      passwordHash: hash,
      name: 'Admin User',
      role: 'ADMIN',
      status: 'VERIFIED',
    },
  });

  await prisma.admin.create({
    data: {
      id: 'admin-record-id',
      userId: 'admin-test-id',
    },
  });

  console.log('Admin user created successfully');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
