import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { StateMachineModule } from '../../state-machine/state-machine.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    PricingModule,
    StateMachineModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
})
export class OrdersModule {}
