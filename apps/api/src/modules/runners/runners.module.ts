import { Module } from '@nestjs/common';
import { RunnersService } from './runners.service.js';
import { RunnersController, RunnerController } from './runners.controller.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { StateMachineModule } from '../../state-machine/state-machine.module.js';

@Module({
  imports: [AuditModule, StateMachineModule],
  controllers: [RunnersController, RunnerController],
  providers: [RunnersService, PrismaService],
})
export class RunnersModule {}
