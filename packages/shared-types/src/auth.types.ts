import { z } from 'zod';

export const passwordSchema = z.string().min(8).max(72).refine(
  (val) => Buffer.byteLength(val, 'utf8') <= 72,
  'Password must not exceed 72 bytes'
);

// Syrian local phone format: 09 followed by 8 digits, e.g. 0912345678.
// Used for the WhatsApp identity and alternate phone fields across
// registration/login. No international prefix (+963) is required.
export const SyrianPhoneSchema = z
  .string()
  .trim()
  .min(1, 'رقم الواتساب مطلوب')
  .regex(
    /^09\d{8}$/,
    'رقم الواتساب يجب أن يكون بالصيغة المحلية (مثال: 0912345678)',
  );

export const AddressSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string(),
});

export const RegisterSchema = z.object({
  name: z.string().min(2),
  whatsapp: SyrianPhoneSchema,
  altPhone: SyrianPhoneSchema.nullable().optional(),
  password: passwordSchema,
  address: AddressSchema,
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  whatsapp: SyrianPhoneSchema,
  password: passwordSchema,
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshRequest = z.infer<typeof RefreshSchema>;

export type UserRole = 'CUSTOMER' | 'RUNNER' | 'ADMIN';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: UserRole;
    status: string;
  };
};

export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LogoutDto = z.infer<typeof LogoutSchema>;
