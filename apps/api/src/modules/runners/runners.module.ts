import { Module } from '@nestjs/common';
import { RunnersService } from './runners.service.js';
import { RunnersController, RunnerController } from './runners.controller.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { StateMachineModule } from '../../state-machine/state-machine.module.js';

@Module({
  imports: [AuditModule, StateMachineModule, PrismaModule],
  controllers: [RunnersController, RunnerController],
  providers: [RunnersService],
})
export class RunnersModule {}
