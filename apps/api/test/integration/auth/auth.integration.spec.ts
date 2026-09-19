import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { cleanDatabase, prisma } from '../setup';
import { createTestApp, closeTestApp, getRequest } from '../helpers/app.helper';
import { seedAdmin, seedRunner, seedCustomer, loginAs } from '../helpers/seed.helper';

const jwtKeys = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
});

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

let adminToken: string;
let runnerToken: string;
let customerToken: string;

beforeAll(async () => {
  process.env.JWT_PRIVATE_KEY = jwtKeys.privateKey;
  process.env.JWT_PUBLIC_KEY = jwtKeys.publicKey;
  await createTestApp();
});

afterAll(async () => {
  await closeTestApp();
});

beforeEach(async () => {
  await cleanDatabase();
  await seedAdmin(prisma);
  await seedRunner(prisma);
  await seedCustomer(prisma);
  const request = getRequest();
  adminToken = await loginAs(request, '+963999000001', 'Admin@12345');
  runnerToken = await loginAs(request, '+963999000002', 'Runner@12345');
  customerToken = await loginAs(request, '+963999000003', 'Customer@12345');
});

describe('POST /auth/register', () => {
  it('scenario 1 - successful registration', async () => {
    const request = getRequest();
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'New Customer',
        whatsapp: '+963999123456',
        altPhone: null,
        password: 'Password@123',
        address: { lat: 33.5138, lng: 36.2765, description: 'Test Address' },
      });

    expect(res.status).toBe(201);

    const user = await prisma.user.findUnique({
      where: { whatsapp: '+963999123456' },
    });
    expect(user).not.toBeNull();
    expect(user!.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(user!.passwordHash).not.toBe('Password@123');

    const customer = await prisma.customer.findUnique({
      where: { userId: user!.id },
    });
    expect(customer).not.toBeNull();
  });

  it('scenario 2 - duplicate WhatsApp returns 409', async () => {
    const request = getRequest();

    await request
      .post('/api/v1/auth/register')
      .send({
        name: 'First User',
        whatsapp: '+963999123456',
        altPhone: null,
        password: 'Password@123',
        address: { lat: 33.5138, lng: 36.2765, description: 'Test' },
      });

    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Second User',
        whatsapp: '+963999123456',
        altPhone: null,
        password: 'Password@123',
        address: { lat: 33.5138, lng: 36.2765, description: 'Test' },
      });

    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('scenario 3 - successful login returns tokens', async () => {
    const request = getRequest();
    const res = await request
      .post('/api/v1/auth/login')
      .send({ whatsapp: '+963999000003', password: 'Customer@12345' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    const decoded = decodeJwt(res.body.accessToken) as {
      sub: string;
      role: string;
      status: string;
    };
    expect(decoded.sub).toBeTruthy();
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.status).toBe('VERIFIED');
  });

  it('scenario 4 - wrong password returns 401', async () => {
    const request = getRequest();
    const res = await request
      .post('/api/v1/auth/login')
      .send({ whatsapp: '+963999000003', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
  });

  it('scenario 5 - suspended account returns 401', async () => {
    const hashedPassword = await bcrypt.hash('Customer@12345', 12);
    await prisma.user.create({
      data: {
        name: 'Suspended User',
        whatsapp: '+963999000007',
        passwordHash: hashedPassword,
        role: UserRole.CUSTOMER,
        status: UserStatus.SUSPENDED,
      },
    });

    const request = getRequest();
    const res = await request
      .post('/api/v1/auth/login')
      .send({ whatsapp: '+963999000007', password: 'Customer@12345' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('scenario 6 - refresh token returns new access token', async () => {
    const request = getRequest();
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ whatsapp: '+963999000003', password: 'Customer@12345' });

    const oldAccessToken = loginRes.body.accessToken;
    const refreshToken = loginRes.body.refreshToken;

    const res = await request
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.accessToken).not.toBe(oldAccessToken);
    expect(res.body.refreshToken).toBeTruthy();

    const decoded = decodeJwt(res.body.accessToken) as {
      sub: string;
      role: string;
      status: string;
    };
    expect(decoded.sub).toBeTruthy();
    expect(decoded.role).toBe('CUSTOMER');
  });
});

describe('POST /auth/logout', () => {
  it('scenario 7 - logout then refresh returns 401', async () => {
    const request = getRequest();
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ whatsapp: '+963999000003', password: 'Customer@12345' });

    const refreshToken = loginRes.body.refreshToken;

    const logoutRes = await request
      .post('/api/v1/auth/logout')
      .send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});
