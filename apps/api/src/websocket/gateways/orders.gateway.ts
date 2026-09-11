import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SOCKET_SERVERS } from './socket-registry.js';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  io: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    SOCKET_SERVERS.orders = null;
  }

  async afterInit(server: Server) {
    SOCKET_SERVERS.orders = server;
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.toString().split(' ')[1];

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const jwtConfig = this.configService.get('jwt');
      const publicKey = jwtConfig?.publicKey;
      const payload = this.jwtService.verify(token, {
        publicKey: publicKey || undefined,
        algorithms: ['RS256'],
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      if (payload.role === 'CUSTOMER') {
        client.join(`customer:${payload.sub}`);
      } else if (payload.role === 'RUNNER') {
        client.join(`runner:${payload.sub}`);
      } else if (payload.role === 'ADMIN') {
        client.join(`admin:all`);
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // Cleanup logic if needed
  }
}
