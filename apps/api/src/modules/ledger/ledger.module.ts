import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { LedgerController } from './ledger.controller.js';
import { LedgerService } from './ledger.service.js';

@Module({
  imports: [],
  controllers: [LedgerController],
  providers: [LedgerService, PrismaService],
})
export class LedgerModule {}
