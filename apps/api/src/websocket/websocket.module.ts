import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersGateway } from './gateways/orders.gateway.js';
import { AdminGateway } from './gateways/admin.gateway.js';

@Module({})
export class WebsocketModule {
  static registerAsync() {
    return {
      module: WebsocketModule,
      imports: [JwtModule],
      providers: [OrdersGateway, AdminGateway],
    };
  }
}
