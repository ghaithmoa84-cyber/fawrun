import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PricingService } from './pricing.service.js';

@Module({
  imports: [AuditModule, NotificationsModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}