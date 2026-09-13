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
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RefreshDto } from './dto/refresh.dto.js';
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

  async register(dto: RegisterDto) {
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

  async login(dto: LoginDto, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({
      where: { whatsapp: dto.whatsapp },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'VERIFIED') {
      throw new UnauthorizedException('Account is not verified');
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

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        selector,
        tokenHash,
        deviceInfo,
        isRevoked: false,
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      event: 'TOKEN_ISSUED',
      meta: { method: 'login' },
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

  async refresh(dto: RefreshDto) {
    // Extract selector from the refresh token (first 32 chars = 16 bytes hex)
    // Format: selector:secret
    const [selector, secret] = dto.refreshToken.split(':');
    if (!selector || !secret) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const token = await this.prisma.refreshToken.findUnique({
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

    if (user.isDeleted || user.status !== 'VERIFIED') {
      throw new UnauthorizedException('Account is not active');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, status: user.status },
      {
        algorithm: 'RS256',
        expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY,
      },
    );

    return {
      accessToken,
      refreshToken: dto.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
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
