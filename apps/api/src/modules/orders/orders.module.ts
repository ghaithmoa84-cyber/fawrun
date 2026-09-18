import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { StateMachineModule } from '../../state-machine/state-machine.module.js';
import { OrdersController } from './orders.controller.js';
import { CustomerOrdersService } from './services/customer-orders.service.js';
import { AdminOrderQueryService } from './services/admin-order-query.service.js';
import { AdminOrderCommandService } from './services/admin-order-command.service.js';
import { RunnerOrdersService } from './services/runner-orders.service.js';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    LedgerModule,
    NotificationsModule,
    PricingModule,
    StateMachineModule,
  ],
  controllers: [OrdersController],
  providers: [
    CustomerOrdersService,
    AdminOrderQueryService,
    AdminOrderCommandService,
    RunnerOrdersService,
  ],
})
export class OrdersModule {}