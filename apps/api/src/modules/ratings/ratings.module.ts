import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RatingsController } from './ratings.controller.js';
import { RatingsService } from './ratings.service.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}