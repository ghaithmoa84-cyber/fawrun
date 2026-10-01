import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage, type SendResponse } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service.js';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  orderId?: string;
  type?: string;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.initFirebase();
  }

  private initFirebase(): void {
    if (getApps().length > 0) {
      this.enabled = true;
      return;
    }

    try {
      const serviceAccountJson = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_JSON',
      );
      const serviceAccountPath =
        this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ??
        './firebase-service-account.json';

      let serviceAccount: ServiceAccount | null = null;

      if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
        serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
      } else {
        const resolvedPath = path.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : path.resolve(process.cwd(), serviceAccountPath);

        if (fs.existsSync(resolvedPath)) {
          const raw = fs.readFileSync(resolvedPath, 'utf8');
          serviceAccount = JSON.parse(raw) as ServiceAccount;
        }
      }

      if (serviceAccount && serviceAccount.projectId && serviceAccount.privateKey) {
        initializeApp({
          credential: cert(serviceAccount),
        });
        this.enabled = true;
        this.logger.log(
          `Firebase Admin initialized successfully for project: ${serviceAccount.projectId}`,
        );
      } else {
        this.logger.warn(
          'FCM push notifications disabled — neither FIREBASE_SERVICE_ACCOUNT_JSON nor valid service account file was found',
        );
      }
    } catch (error) {
      this.logger.warn(
        'Failed to initialize Firebase Admin SDK. FCM push notifications disabled',
        error,
      );
      this.enabled = false;
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async sendToUser(userId: string, payload: FcmPayload): Promise<void> {
    if (!this.enabled) return;

    try {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { id: true, token: true },
      });

      if (!deviceTokens || deviceTokens.length === 0) {
        return;
      }

      const registrationTokens = deviceTokens.map((d) => d.token);

      const dataPayload: Record<string, string> = {
        title: payload.title,
        body: payload.body,
        ...(payload.data ?? {}),
      };

      if (payload.orderId) {
        dataPayload.orderId = payload.orderId;
      }
      if (payload.type) {
        dataPayload.type = payload.type;
        dataPayload.notification_type = payload.type;
      }

      const message: MulticastMessage = {
        tokens: registrationTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: dataPayload,
        android: {
          priority: 'high',
          notification: {
            channelId: 'forerun_orders_channel',
            sound: 'default',
          },
        },
      };

      const response = await getMessaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp: SendResponse, index: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(registrationTokens[index]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
        this.logger.log(
          `Cleaned up ${invalidTokens.length} stale FCM device token(s) for user ${userId}`,
        );
      }
    } catch (error) {
      // Best-effort: Log error without disrupting primary business flow
      this.logger.error(
        `Failed to send FCM notification to user ${userId}`,
        error,
      );
    }
  }
}
