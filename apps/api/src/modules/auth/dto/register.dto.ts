import { z } from 'zod';

const passwordSchema = z.string().min(8).max(72).refine(
  (val) => Buffer.byteLength(val, 'utf8') <= 72,
  'Password must not exceed 72 bytes'
);

const addressSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string(),
});

export const RegisterSchema = z.object({
  name: z.string().min(2),
  whatsapp: z.string(),
  altPhone: z.string().nullable(),
  password: passwordSchema,
  address: addressSchema,
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
