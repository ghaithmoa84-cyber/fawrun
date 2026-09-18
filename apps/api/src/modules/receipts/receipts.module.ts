import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { R2Service } from './r2.service.js';
import { ReceiptsController } from './receipts.controller.js';
import { ReceiptsService } from './receipts.service.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [ReceiptsController],
  providers: [R2Service, ReceiptsService],
  exports: [R2Service, ReceiptsService],
})
export class ReceiptsModule {}