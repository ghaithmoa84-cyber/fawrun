import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CONFIG } from '@fawrun/shared-constants';
import type { RegisterRequest, LoginRequest, RefreshRequest } from '@fawrun/shared-types';
import type { LogoutDto } from './dto/logout.dto.js';

function generateSelector(): string {
  return randomBytes(16).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterRequest) {
    const existing = await this.prisma.user.findUnique({
      where: { whatsapp: dto.whatsapp },
    });

    if (existing) {
      throw new ConflictException('User with this WhatsApp number already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, CONFIG.BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          whatsapp: dto.whatsapp,
          altPhone: dto.altPhone,
          passwordHash,
          role: 'CUSTOMER',
          status: 'PENDING_VERIFICATION',
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
        },
      });

      await tx.customerAddress.create({
        data: {
          customerId: customer.id,
          lat: dto.address.lat,
          lng: dto.address.lng,
          description: dto.address.description,
        },
      });

      await this.auditService.log(
        {
          orderId: undefined,
          actorId: user.id,
          actorRole: 'CUSTOMER',
          event: 'USER_REGISTERED',
          fromStatus: undefined,
          toStatus: 'PENDING_VERIFICATION',
          meta: { userId: user.id, role: 'CUSTOMER' },
        },
        tx,
      );

      return user;
    });

    try {
      await this.notificationsService.emitToAdmin('user:new_registration', {
        userId: result.id,
        userName: result.name,
        whatsapp: result.whatsapp,
      });
    } catch {
      // WebSocket emit is best-effort; log but don't fail registration
    }

    return {
      statusCode: 201,
      message: 'Account created successfully. Please verify via WhatsApp.',
      userId: result.id,
    };
  }

  async login(dto: LoginRequest, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({
      where: { whatsapp: dto.whatsapp },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'REJECTED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, status: user.status },
      {
        algorithm: 'RS256',
        expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY,
      },
    );

    const refreshTokenSecret = randomBytes(32).toString('hex');
    const selector = generateSelector();
    const tokenHash = await bcrypt.hash(refreshTokenSecret, CONFIG.BCRYPT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          selector,
          tokenHash,
          deviceInfo,
          isRevoked: false,
        },
      });

      await this.auditService.log(
        {
          actorId: user.id,
          actorRole: user.role,
          event: 'TOKEN_ISSUED',
          meta: { method: 'login' },
        },
        tx,
      );
    });

    return {
      accessToken,
      refreshToken: `${selector}:${refreshTokenSecret}`,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refresh(dto: RefreshRequest) {
    // Extract selector from the refresh token (first 32 chars = 16 bytes hex)
    // Format: selector:secret
    const [selector, secret] = dto.refreshToken.split(':');
    if (!selector || !secret) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    return await this.prisma.$transaction(async (tx) => {
      const token = await tx.refreshToken.findUnique({
        where: { selector, isRevoked: false },
        include: { user: true },
      });

      if (!token) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const isValid = await bcrypt.compare(secret, token.tokenHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const user = token.user;

      if (user.isDeleted || user.status === 'REJECTED' || user.status === 'SUSPENDED') {
        throw new UnauthorizedException('Account is not active');
      }

      await tx.refreshToken.update({
        where: { id: token.id },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      const newSecret = randomBytes(32).toString('hex');
      const newSelector = generateSelector();
      const newTokenHash = await bcrypt.hash(newSecret, CONFIG.BCRYPT_ROUNDS);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          selector: newSelector,
          tokenHash: newTokenHash,
          deviceInfo: token.deviceInfo,
          isRevoked: false,
        },
      });

      await this.auditService.log(
        {
          actorId: user.id,
          actorRole: user.role,
          event: 'TOKEN_REFRESHED',
          fromStatus: 'ISSUED',
          toStatus: 'ROTATED',
          meta: { selector: newSelector },
        },
        tx,
      );

      const accessToken = this.jwtService.sign(
        { sub: user.id, role: user.role, status: user.status },
        {
          algorithm: 'RS256',
          expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY,
        },
      );

      return {
        accessToken,
        refreshToken: `${newSelector}:${newSecret}`,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      };
    });
  }

  async logout(dto: LogoutDto) {
    const [selector, secret] = dto.refreshToken.split(':');
    if (!selector || !secret) {
      return {
        statusCode: 200,
        message: 'Logged out successfully',
      };
    }

    const token = await this.prisma.refreshToken.findUnique({
      where: { selector, isRevoked: false },
    });

    if (token) {
      const isValid = await bcrypt.compare(secret, token.tokenHash);
      if (isValid) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { isRevoked: true, revokedAt: new Date() },
        });
      }
    }

    return {
      statusCode: 200,
      message: 'Logged out successfully',
    };
  }
}
