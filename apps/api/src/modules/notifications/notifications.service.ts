import { Injectable, Logger, Optional } from '@nestjs/common';
import { Server } from 'socket.io';
import { SOCKET_SERVERS } from '../../websocket/gateways/socket-registry.js';
import { SoundType } from '@forerun/shared-types';
import { FcmService } from './fcm.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Optional() private readonly fcmService?: FcmService) {}

  private emit(server: Server | null, room: string, event: string, data: unknown, sound?: SoundType): void {
    if (server) {
      const base =
        typeof data === 'object' && data !== null
          ? { ...(data as Record<string, unknown>) }
          : { data };
      const payload = sound !== undefined ? { ...base, sound } : base;
      if (room) {
        server.to(room).emit(event, payload);
      } else {
        server.emit(event, payload);
      }
    } else {
      this.logger.debug(`Socket server not available for ${event}`);
    }
  }

  emitToCustomer(customerUserId: string, event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.orders, `customer:${customerUserId}`, event, data, sound);

    if (this.fcmService && typeof data === 'object' && data !== null) {
      this.triggerCustomerFcm(customerUserId, event, data as Record<string, unknown>).catch(
        (err) => {
          this.logger.warn(`Failed to trigger customer FCM for event ${event}`, err);
        },
      );
    }
  }

  private async triggerCustomerFcm(
    customerUserId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    if (!this.fcmService) return;

    let title = 'FORERUN';
    let body = 'لديك تحديث جديد على طلبك';
    const orderId = (data.orderId as string) || undefined;
    const orderNumber = (data.orderNumber as string) || undefined;

    if (event === 'order:status_changed') {
      const newStatus = data.newStatus as string;
      const orderPrefix = orderNumber ? `طلب #${orderNumber}: ` : '';

      switch (newStatus) {
        case 'AWAITING_RUNNER':
          title = 'تم اعتماد طلبك ✅';
          body = `${orderPrefix}جاري البحث عن مندوب لتوصيل طلبك.`;
          break;
        case 'ASSIGNED':
          title = 'تم تعيين مندوب 🛵';
          body = `${orderPrefix}المندوب استلم طلبك وسيبدأ تنفيذه قريباً.`;
          break;
        case 'IN_PROGRESS':
          title = 'بدأ تنفيذ طلبك 🛒';
          body = `${orderPrefix}المندوب بدأ الآن بشراء المواد المطلوبة.`;
          break;
        case 'OUT_FOR_DELIVERY':
          title = 'طلبك في الطريق 🛵';
          body = `${orderPrefix}المندوب في طريقه لتسليم طلبك.`;
          break;
        case 'DELIVERED':
          title = 'تم تسليم الطلب بنجاح 🎉';
          body = `${orderPrefix}شكراً لاستخدامك FORERUN!`;
          break;
        case 'CANCELLED':
          title = 'تم إلغاء الطلب';
          body = `${orderPrefix}تم إلغاء هذا الطلب.`;
          break;
        default:
          title = 'تحديث على طلبك';
          body = `${orderPrefix}تم تحديث حالة طلبك.`;
          break;
      }
    } else if (event === 'account:verified') {
      title = 'تم تفعيل حسابك 🎉';
      body = 'حسابك في FORERUN أصبح موثقاً وجاهزاً للطلب الآن!';
    }

    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) {
        stringData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }

    await this.fcmService.sendToUser(customerUserId, {
      title,
      body,
      orderId,
      type: event,
      data: stringData,
    });
  }

  emitToRunner(runnerUserId: string, event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.orders, `runner:${runnerUserId}`, event, data, sound);
  }

  emitToAdmin(event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.admin, 'admin:all', event, data, sound);
  }

  emitToAll(event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.orders, '', event, data, sound);
  }
}

