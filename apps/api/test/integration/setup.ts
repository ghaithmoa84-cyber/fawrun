import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// تنظيف DB قبل كل test suite
export async function cleanDatabase() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.settlementItem.deleteMany(),
    prisma.settlement.deleteMany(),
    prisma.rating.deleteMany(),
    prisma.receipt.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.orderStore.deleteMany(),
    prisma.order.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.customerAddress.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.runner.deleteMany(),
    prisma.admin.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export { prisma };
