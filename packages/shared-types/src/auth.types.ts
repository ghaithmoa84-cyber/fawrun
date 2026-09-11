import { z } from 'zod';

export const AddressSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  description: z.string(),
});

export const RegisterSchema = z.object({
  name: z.string().min(2),
  whatsapp: z.string(),
  altPhone: z.string().nullable(),
  password: z.string().min(8),
  address: AddressSchema,
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  whatsapp: z.string(),
  password: z.string(),
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
