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

    const refreshToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(refreshToken, CONFIG.BCRYPT_ROUNDS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
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
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refresh(dto: RefreshDto) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { isRevoked: false },
      include: { user: true },
    });

    let matchedToken: (typeof tokens)[number] | null = null;

    for (const token of tokens) {
      const isValid = await bcrypt.compare(dto.refreshToken, token.tokenHash);
      if (isValid) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = matchedToken.user;

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
    const tokens = await this.prisma.refreshToken.findMany({
      where: { isRevoked: false },
    });

    for (const token of tokens) {
      const isValid = await bcrypt.compare(dto.refreshToken, token.tokenHash);
      if (isValid) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { isRevoked: true, revokedAt: new Date() },
        });
        break;
      }
    }

    return {
      statusCode: 200,
      message: 'Logged out successfully',
    };
  }
}
