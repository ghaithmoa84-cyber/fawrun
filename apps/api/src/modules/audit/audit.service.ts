import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '@prisma/client';

export interface AuditLogParams {
  orderId?: string;
  actorId?: string;
  actorRole?: string;
  event: string;
  fromStatus?: string;
  toStatus?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        orderId: params.orderId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        event: params.event,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        meta: params.meta as Prisma.InputJsonValue,
      },
    });
  }
}
