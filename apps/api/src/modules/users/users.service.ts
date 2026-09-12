import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(page: number, limit: number) {
    const [total, data] = await Promise.all([
      this.prisma.user.count({
        where: { isDeleted: false, role: 'CUSTOMER' },
      }),
      this.prisma.user.findMany({
        where: { isDeleted: false, role: 'CUSTOMER' },
        include: { customer: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data.map((u) => ({
        id: u.id,
        name: u.name,
        whatsapp: u.whatsapp,
        altPhone: u.altPhone,
        status: u.status,
        createdAt: u.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false },
      include: {
        customer: {
          include: { address: true },
        },
      },
    });

    if (!user || !user.customer) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      whatsapp: user.whatsapp,
      altPhone: user.altPhone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      customer: {
        id: user.customer.id,
        completedOrders: user.customer.completedOrders,
        totalFeesPaid: user.customer.totalFeesPaid,
        createdAt: user.customer.createdAt,
      },
      address: user.customer.address
        ? {
            id: user.customer.address.id,
            lat: user.customer.address.lat,
            lng: user.customer.address.lng,
            description: user.customer.address.description,
            createdAt: user.customer.address.createdAt,
            updatedAt: user.customer.address.updatedAt,
          }
        : null,
    };
  }

  async verify(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false, role: 'CUSTOMER' },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'PENDING_VERIFICATION') {
      throw new UnprocessableEntityException(
        'Account is not in pending verification state',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: { id, status: 'PENDING_VERIFICATION', isDeleted: false, role: 'CUSTOMER' },
        data: { status: 'VERIFIED' },
      });

      if (updateResult.count !== 1) {
        throw new UnprocessableEntityException(
          'Account is not in pending verification state',
        );
      }

      await this.auditService.log({
        actorId,
        actorRole: 'ADMIN',
        event: 'USER_VERIFIED',
        fromStatus: 'PENDING_VERIFICATION',
        toStatus: 'VERIFIED',
        meta: { userId: id },
      }, tx);
    });

    try {
      await this.notificationsService.emitToCustomer(id, 'account:verified', {
        message: 'تم تفعيل حسابك',
      });
    } catch {
      // WebSocket emit is best-effort
    }

    return {
      statusCode: 200,
      message: 'Account verified successfully',
    };
  }

  async reject(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false, role: 'CUSTOMER' },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'PENDING_VERIFICATION') {
      throw new UnprocessableEntityException(
        'Account is not in pending verification state',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: { id, status: 'PENDING_VERIFICATION', isDeleted: false, role: 'CUSTOMER' },
        data: { status: 'REJECTED' },
      });

      if (updateResult.count !== 1) {
        throw new UnprocessableEntityException(
          'Account is not in pending verification state',
        );
      }

      await this.auditService.log({
        actorId,
        actorRole: 'ADMIN',
        event: 'USER_REJECTED',
        fromStatus: 'PENDING_VERIFICATION',
        toStatus: 'REJECTED',
        meta: { userId: id },
      }, tx);
    });

    return {
      statusCode: 200,
      message: 'Account rejected successfully',
    };
  }

  async suspend(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, isDeleted: false, role: 'CUSTOMER' },
      include: { refreshTokens: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status: 'SUSPENDED' },
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      await this.auditService.log({
        actorId,
        actorRole: 'ADMIN',
        event: 'USER_SUSPENDED',
        fromStatus: user.status,
        toStatus: 'SUSPENDED',
        meta: { userId: id },
      }, tx);
    });

    return {
      statusCode: 200,
      message: 'Account suspended successfully',
    };
  }
}
