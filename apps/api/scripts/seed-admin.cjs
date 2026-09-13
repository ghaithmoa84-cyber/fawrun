const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.trim() === '') {
    console.error('ERROR: ADMIN_PASSWORD environment variable is required and must be non-empty');
    process.exit(1);
  }
  
  const hash = await bcrypt.hash(adminPassword, 12);
  
  // Create admin user and admin profile atomically
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: 'admin-test-id',
        whatsapp: '96300000001',
        passwordHash: hash,
        name: 'Admin User',
        role: 'ADMIN',
        status: 'VERIFIED',
      },
    });

    await tx.admin.create({
      data: {
        id: 'admin-record-id',
        userId: user.id,
      },
    });
  });

  console.log('Admin user created successfully');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
