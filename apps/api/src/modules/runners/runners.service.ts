import { Prisma } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CONFIG } from '@fawrun/shared-constants';

@Injectable()
export class RunnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(page: number, limit: number) {
    const [total, data] = await Promise.all([
      this.prisma.runner.count({
        where: { user: { isDeleted: false } },
      }),
      this.prisma.runner.findMany({
        where: { user: { isDeleted: false } },
        include: { user: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data.map((r) => ({
        id: r.id,
        name: r.user.name,
        whatsapp: r.user.whatsapp,
        status: r.status,
        isVisible: r.isVisible,
        avgRating: r.avgRating,
        totalRatings: r.totalRatings,
        notes: r.notes,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(body: {
    name: string;
    whatsapp: string;
    password: string;
    altPhone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { whatsapp: body.whatsapp },
    });

    if (existing) {
      throw new ConflictException('Runner with this WhatsApp already exists');
    }

    const passwordHash = await bcrypt.hash(body.password, CONFIG.BCRYPT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: body.name,
          whatsapp: body.whatsapp,
          altPhone: body.altPhone || null,
          passwordHash,
          role: 'RUNNER',
          status: 'VERIFIED',
        },
      });

      await tx.runner.create({
        data: {
          userId: user.id,
        },
      });

      await this.auditService.log({
        actorRole: 'ADMIN',
        event: 'RUNNER_CREATED',
        meta: { userId: user.id, runnerWhatsapp: body.whatsapp },
      });
    });

    return {
      statusCode: 201,
      message: 'Runner account created successfully',
    };
  }

  async update(body: {
    id: string;
    name?: string;
    altPhone?: string;
    notes?: string;
    password?: string;
  }) {
    const runner = await this.prisma.runner.findUnique({
      where: { id: body.id },
      include: { user: true },
    });

    if (!runner) {
      throw new NotFoundException('Runner not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.UserUpdateInput = {
        name: body.name ?? undefined,
        altPhone: body.altPhone ?? undefined,
      };

      if (body.password) {
        updateData.passwordHash = await bcrypt.hash(
          body.password,
          CONFIG.BCRYPT_ROUNDS,
        );
      }

      await tx.user.update({
        where: { id: runner.userId },
        data: updateData,
      });

      await tx.runner.update({
        where: { id: body.id },
        data: body.notes !== undefined ? { notes: body.notes } : {},
      });

      await this.auditService.log({
        actorRole: 'ADMIN',
        event: 'RUNNER_UPDATED',
        meta: { runnerId: body.id },
      });
    });

    return {
      statusCode: 200,
      message: 'Runner updated successfully',
    };
  }

  async updateVisibility(body: { id: string; isVisible: boolean }) {
    const runner = await this.prisma.runner.findUnique({
      where: { id: body.id },
    });

    if (!runner) {
      throw new NotFoundException('Runner not found');
    }

    await this.prisma.runner.update({
      where: { id: body.id },
      data: { isVisible: body.isVisible },
    });

    await this.auditService.log({
      actorRole: 'ADMIN',
      event: 'RUNNER_VISIBILITY_CHANGED',
      meta: { runnerId: body.id, isVisible: body.isVisible },
    });

    return {
      statusCode: 200,
      message: `Runner ${body.isVisible ? 'visible' : 'hidden'} successfully`,
    };
  }
}
