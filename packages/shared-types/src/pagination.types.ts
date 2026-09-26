import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'رقم الصفحة يجب أن يكون 1 على الأقل').default(1),
  limit: z.coerce.number().int().min(1, 'الحد الأدنى 1').max(100, 'الحد الأقصى 100').default(20),
});

export type PaginationQueryRequest = z.infer<typeof PaginationQuerySchema>;
