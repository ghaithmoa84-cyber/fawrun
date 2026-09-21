import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../modules/users/users.service.js';
import { SOCKET_SERVERS } from './socket-registry.js';
import { getCorsOrigins } from './cors-origins.js';

@WebSocketGateway({
  namespace: '/admin',
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
})
export class AdminGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  io: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    SOCKET_SERVERS.admin = null;
  }

  async afterInit(server: Server) {
    SOCKET_SERVERS.admin = server;
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.toString().split(' ')[1];

    if (!token) {
      client.disconnect(true);
      return;
    }

    let userId: string;
    try {
      const jwtConfig = this.configService.get('jwt');
      const publicKey = jwtConfig?.publicKey;
      const payload = this.jwtService.verify(token, {
        publicKey: publicKey || undefined,
        algorithms: ['RS256'],
      });
      userId = payload.sub;
    } catch {
      client.disconnect(true);
      return;
    }

    let user: { id: string; role: string; status: string; isDeleted: boolean } | null;
    try {
      user = await this.usersService.findLeanById(userId);
    } catch {
      client.disconnect(true);
      return;
    }

    if (!user || user.isDeleted || user.status !== 'VERIFIED') {
      client.disconnect(true);
      return;
    }

    if (user.role !== 'ADMIN') {
      client.disconnect(true);
      return;
    }

    client.data.userId = user.id;
    client.data.role = user.role;

    client.join('admin:all');
  }

  handleDisconnect(_client: Socket) {
    // Cleanup logic if needed
  }
}
