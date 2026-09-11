import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RunnersModule } from './modules/runners/runners.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { WebsocketModule } from './websocket/websocket.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { jwtConfig } from './config/jwt.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 100,
        },
        {
          name: 'login',
          ttl: 900000,
          limit: 10,
        },
        {
          name: 'register',
          ttl: 3600000,
          limit: 3,
        },
      ],
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSettings = configService.get('jwt');
        const privateKey = jwtSettings?.privateKey || '';
        const publicKey = jwtSettings?.publicKey || '';
        
        if (!privateKey || !publicKey) {
          throw new Error('JWT RS256 keys are required: both privateKey and publicKey must be configured');
        }
        
        return {
          privateKey,
          publicKey,
          signOptions: { algorithm: 'RS256' as const, expiresIn: '2h' },
          verifyOptions: { algorithms: ['RS256' as const] },
        };
      },
    }),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    WebsocketModule.registerAsync(),
    AuthModule,
    UsersModule,
    RunnersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
