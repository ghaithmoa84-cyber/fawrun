import { Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { PrismaService } from '../../database/prisma.service.js';

@Module({
  providers: [AuditService, PrismaService],
  exports: [AuditService],
})
export class AuditModule {}
