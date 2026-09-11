import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2),
  whatsapp: z.string(),
  altPhone: z.string().nullable(),
  password: z.string().min(8),
  address: z.object({
    lat: z.number(),
    lng: z.number(),
    description: z.string(),
  }),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
