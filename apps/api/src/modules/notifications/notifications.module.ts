import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { TelegramService } from './telegram.service.js';
import { FcmService } from './fcm.service.js';

@Module({
  providers: [NotificationsService, TelegramService, FcmService],
  exports: [NotificationsService, TelegramService, FcmService],
})
export class NotificationsModule {}
