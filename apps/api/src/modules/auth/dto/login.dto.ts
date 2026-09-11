import { z } from 'zod';

const passwordSchema = z.string().min(8).max(72).refine(
  (val) => Buffer.byteLength(val, 'utf8') <= 72,
  'Password must not exceed 72 bytes'
);

export const LoginSchema = z.object({
  whatsapp: z.string(),
  password: passwordSchema,
});

export type LoginDto = z.infer<typeof LoginSchema>;
