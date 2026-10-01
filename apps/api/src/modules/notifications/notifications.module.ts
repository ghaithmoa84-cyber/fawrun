import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { TelegramService } from './telegram.service.js';

@Module({
  providers: [NotificationsService, TelegramService],
  exports: [NotificationsService, TelegramService],
})
export class NotificationsModule {}
