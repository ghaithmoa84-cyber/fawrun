import { z } from 'zod';

export const RefreshSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshDto = z.infer<typeof RefreshSchema>;
