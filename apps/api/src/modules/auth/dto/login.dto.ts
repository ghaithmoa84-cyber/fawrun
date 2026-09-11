import { z } from 'zod';

export const LoginSchema = z.object({
  whatsapp: z.string(),
  password: z.string(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
