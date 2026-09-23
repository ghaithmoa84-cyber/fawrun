import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ACCOUNT_SUSPENDED_MESSAGE } from '@fawrun/shared-constants';

vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

vi.mock('../../src/database/prisma.service.js', () => ({
  PrismaService: class {},
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  UsersService: class {},
}));

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../src/database/prisma.service';
import type { UsersService } from '../../src/modules/users/users.service';

describe('JwtAuthGuard - Suspended account check', () => {
  let guard: JwtAuthGuard;
  let mockReflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let mockJwtService: { verify: ReturnType<typeof vi.fn> };
  let mockUsersService: { findLeanById: ReturnType<typeof vi.fn> };
  let mockPrisma: { admin: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    };
    mockJwtService = {
      verify: vi.fn().mockReturnValue({ sub: 'user_1', role: 'CUSTOMER', status: 'VERIFIED' }),
    };
    mockUsersService = {
      findLeanById: vi.fn(),
    };
    mockPrisma = {
      admin: { findUnique: vi.fn() },
    };

    guard = new JwtAuthGuard(
      mockReflector as unknown as Reflector,
      mockJwtService as unknown as JwtService,
      mockUsersService as unknown as UsersService,
      mockPrisma as unknown as PrismaService,
    );
  });

  function createMockContext(authHeader?: string): ExecutionContext {
    const request: Record<string, unknown> = {
      headers: {
        authorization: authHeader,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access for a VERIFIED user', async () => {
    mockUsersService.findLeanById.mockResolvedValue({
      id: 'user_1',
      role: 'CUSTOMER',
      status: 'VERIFIED',
      isDeleted: false,
    });

    const context = createMockContext('Bearer valid.jwt.token');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('allows access for a PENDING_VERIFICATION user', async () => {
    mockUsersService.findLeanById.mockResolvedValue({
      id: 'user_2',
      role: 'CUSTOMER',
      status: 'PENDING_VERIFICATION',
      isDeleted: false,
    });

    const context = createMockContext('Bearer valid.jwt.token');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('rejects a SUSPENDED user with 401 and ACCOUNT_SUSPENDED_MESSAGE', async () => {
    mockUsersService.findLeanById.mockResolvedValue({
      id: 'user_suspended',
      role: 'CUSTOMER',
      status: 'SUSPENDED',
      isDeleted: false,
    });

    const context = createMockContext('Bearer valid.jwt.token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(ACCOUNT_SUSPENDED_MESSAGE),
    );
  });

  it('rejects a SUSPENDED runner with 401 and ACCOUNT_SUSPENDED_MESSAGE', async () => {
    mockUsersService.findLeanById.mockResolvedValue({
      id: 'runner_suspended',
      role: 'RUNNER',
      status: 'SUSPENDED',
      isDeleted: false,
    });

    const context = createMockContext('Bearer valid.jwt.token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(ACCOUNT_SUSPENDED_MESSAGE),
    );
  });

  it('rejects deleted user', async () => {
    mockUsersService.findLeanById.mockResolvedValue({
      id: 'user_deleted',
      role: 'CUSTOMER',
      status: 'VERIFIED',
      isDeleted: true,
    });

    const context = createMockContext('Bearer valid.jwt.token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('User not found or deleted'),
    );
  });

  it('allows public endpoints without token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);

    const context = createMockContext(undefined);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
