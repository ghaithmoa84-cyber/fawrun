import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manually load apps/api/.env so Nest's ConfigModule (AppModule) sees the same
// values as the seed helpers. dotenv is not a direct dependency, so parse the
// file ourselves.
{
  const envPath = resolve(__dirname, '../../.env');
  const contents = readFileSync(envPath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Force the Nest test app (AppModule -> ConfigModule -> DATABASE_URL) to use
// the same test database as the seed helpers and cleanDatabase().
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

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
