import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(prisma: PrismaClient) {
  const hash = await bcrypt.hash('Admin@12345', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Test Admin',
      whatsapp: '0999000001',
      passwordHash: hash,
      role: UserRole.ADMIN,
      status: UserStatus.VERIFIED,
      admin: { create: {} },
    },
    include: { admin: true },
  });
  return user;
}

export async function seedRunner(
  prisma: PrismaClient,
  whatsapp = '0999000002',
) {
  const hash = await bcrypt.hash('Runner@12345', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Test Runner',
      whatsapp,
      passwordHash: hash,
      role: UserRole.RUNNER,
      status: UserStatus.VERIFIED,
      runner: { create: { status: 'AVAILABLE', isVisible: true } },
    },
    include: { runner: true },
  });
  return user;
}

export async function seedCustomer(prisma: PrismaClient) {
  const hash = await bcrypt.hash('Customer@12345', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Test Customer',
      whatsapp: '0999000003',
      passwordHash: hash,
      role: UserRole.CUSTOMER,
      status: UserStatus.VERIFIED,
      customer: {
        create: {
          address: {
            create: {
              lat: 33.5138,
              lng: 36.2765,
              description: 'Damascus Test Address',
            },
          },
        },
      },
    },
    include: { customer: { include: { address: true } } },
  });
  return user;
}

export async function loginAs(
  request: ReturnType<typeof import('./app.helper').getRequest>,
  whatsapp: string,
  password: string,
): Promise<string> {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ whatsapp, password });
  return res.body.accessToken;
}
