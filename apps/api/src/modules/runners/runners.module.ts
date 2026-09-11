import { Module } from '@nestjs/common';
import { RunnersService } from './runners.service.js';
import { RunnersController } from './runners.controller.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  controllers: [RunnersController],
  providers: [RunnersService, PrismaService],
})
export class RunnersModule {}
