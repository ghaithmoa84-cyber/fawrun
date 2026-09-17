import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { LedgerController } from './ledger.controller.js';
import { LedgerService } from './ledger.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LedgerController],
  providers: [LedgerService],
})
export class LedgerModule {}
