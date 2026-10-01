import { z } from 'zod';

export const DeviceTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

export type DeviceTokenRequest = z.infer<typeof DeviceTokenSchema>;

export interface DeviceTokenResponse {
  success: boolean;
  message?: string;
}
