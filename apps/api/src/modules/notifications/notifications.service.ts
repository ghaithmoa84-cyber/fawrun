import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SOCKET_SERVERS } from '../../websocket/gateways/socket-registry.js';
import { SoundType } from '@fawrun/shared-types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private emit(server: Server | null, room: string, event: string, data: unknown, sound?: SoundType): void {
    if (server) {
      const payload = typeof data === 'object' && data !== null ? { ...(data as Record<string, unknown>), sound } : { data, sound };
      if (room) {
        server.to(room).emit(event, payload);
      } else {
        server.emit(event, payload);
      }
    } else {
      this.logger.debug(`Socket server not available for ${event}`);
    }
  }

  emitToCustomer(customerId: string, event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.orders, `customer:${customerId}`, event, data, sound);
  }

  emitToRunner(runnerId: string, event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.orders, `runner:${runnerId}`, event, data, sound);
  }

  emitToAdmin(event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.admin, 'admin:all', event, data, sound);
  }

  emitToAll(event: string, data: unknown, sound?: SoundType): void {
    this.emit(SOCKET_SERVERS.orders, '', event, data, sound);
  }
}
