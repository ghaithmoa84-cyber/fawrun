import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../database/prisma.service.js';
import { FcmService } from './fcm.service.js';

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
  cert: vi.fn((creds) => creds),
}));

const mockSendEachForMulticast = vi.fn();
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEachForMulticast: mockSendEachForMulticast,
  }),
}));

describe('FcmService', () => {
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockPrisma: {
    deviceToken: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSendEachForMulticast.mockReset();
    loggerWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') return '';
        if (key === 'FIREBASE_SERVICE_ACCOUNT_PATH') return 'non-existent.json';
        return undefined;
      }),
    };

    mockPrisma = {
      deviceToken: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should gracefully disable FCM when no valid credentials are provided', () => {
    const service = new FcmService(
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );

    service.onModuleInit();

    expect(service.isEnabled).toBe(false);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'FCM push notifications disabled — neither FIREBASE_SERVICE_ACCOUNT_JSON nor valid service account file was found',
    );
  });

  it('2. should not attempt to send if user has no registered device tokens', async () => {
    const service = new FcmService(
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );

    mockPrisma.deviceToken.findMany.mockResolvedValue([]);

    await expect(
      service.sendToUser('user-1', {
        title: 'Test Title',
        body: 'Test Body',
      }),
    ).resolves.not.toThrow();

    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('3. should send message and clean up invalid tokens when sending succeeds', async () => {
    mockConfigService.get = vi.fn((key: string) => {
      if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
        return JSON.stringify({
          projectId: 'test-project',
          privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
          clientEmail: 'test@test.iam.gserviceaccount.com',
        });
      }
      return undefined;
    });

    const service = new FcmService(
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );

    service.onModuleInit();
    expect(service.isEnabled).toBe(true);

    mockPrisma.deviceToken.findMany.mockResolvedValue([
      { id: '1', token: 'valid-token' },
      { id: '2', token: 'expired-token' },
    ]);

    mockSendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });

    await service.sendToUser('user-1', {
      title: 'Order Updated',
      body: 'Your order is out for delivery',
      orderId: 'order-123',
    });

    expect(mockSendEachForMulticast).toHaveBeenCalled();
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['expired-token'] } },
    });
  });

  it('4. should swallow errors and not throw if sending throws an exception', async () => {
    mockConfigService.get = vi.fn((key: string) => {
      if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
        return JSON.stringify({
          projectId: 'test-project',
          privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
          clientEmail: 'test@test.iam.gserviceaccount.com',
        });
      }
      return undefined;
    });

    const service = new FcmService(
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );

    service.onModuleInit();
    expect(service.isEnabled).toBe(true);

    mockPrisma.deviceToken.findMany.mockRejectedValue(new Error('DB failure'));

    await expect(
      service.sendToUser('user-1', {
        title: 'Test Title',
        body: 'Test Body',
      }),
    ).resolves.not.toThrow();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to send FCM notification to user user-1',
      expect.any(Error),
    );
  });
});
