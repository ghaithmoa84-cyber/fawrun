import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { UsersService } from '../../modules/users/users.service.js';
import { PrismaService } from '../../database/prisma.service.js';

export interface JwtPayload {
  sub: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    adminId?: string | null;
    role: string;
    status: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.usersService.findLeanById(payload.sub);
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('User not found or deleted');
    }

    let adminId: string | null = null;
    if (user.role === 'ADMIN') {
      const admin = await this.prisma.admin.findUnique({
        where: { userId: user.id },
      });
      adminId = admin?.id ?? null;
    }

    request.user = {
      userId: user.id,
      adminId,
      role: user.role,
      status: user.status,
    };

    return true;
  }
}