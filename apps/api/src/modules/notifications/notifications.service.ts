import { Injectable, Logger } from '@nestjs/common';
import { SOCKET_SERVERS } from '../../websocket/gateways/socket-registry.js';

export type SoundType = 'new_order' | 'status_update' | 'urgent' | 'success';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  emitToCustomer(customerId: string, event: string, data: unknown): void {
    const server = SOCKET_SERVERS.orders;
    if (server) {
      server.to(`customer:${customerId}`).emit(event, data);
    } else {
      this.logger.debug(`Orders socket server not available for ${event}`);
    }
  }

  emitToRunner(runnerId: string, event: string, data: unknown): void {
    const server = SOCKET_SERVERS.orders;
    if (server) {
      server.to(`runner:${runnerId}`).emit(event, data);
    } else {
      this.logger.debug(`Orders socket server not available for ${event}`);
    }
  }

  emitToAdmin(event: string, data: unknown): void {
    const server = SOCKET_SERVERS.admin;
    if (server) {
      server.to('admin:all').emit(event, data);
    } else {
      this.logger.debug(`Admin socket server not available for ${event}`);
    }
  }

  emitToAll(event: string, data: unknown): void {
    const server = SOCKET_SERVERS.orders;
    if (server) {
      server.emit(event, data);
    } else {
      this.logger.debug(`Orders socket server not available for ${event}`);
    }
  }
}
