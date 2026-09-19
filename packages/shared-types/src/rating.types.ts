import { z } from 'zod';

export const CreateRatingSchema = z.object({
  orderId: z.string().cuid(),
  runnerId: z.string().cuid().optional(),
  stars: z.number().int().min(1).max(5),
  note: z.string().trim().max(1000).optional(),
});

export type CreateRatingRequest = z.infer<typeof CreateRatingSchema>;

export const RatingSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  runnerId: z.string().nullable(),
  stars: z.number().int(),
  note: z.string().nullable(),
  storeNameRated: z.string().nullable(),
  isFinal: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
});

export type Rating = z.infer<typeof RatingSchema>;

export const CreateRatingBodySchema = z.object({
  stars: z.number().int().min(1).max(5),
  note: z.string().trim().max(1000).nullable().optional(),
});
export type CreateRatingBodyRequest = z.infer<typeof CreateRatingBodySchema>;

export const UpdateRatingBodySchema = z.object({
  stars: z.number().int().min(1).max(5),
  note: z.string().trim().max(1000).nullable().optional(),
});
export type UpdateRatingBodyRequest = z.infer<typeof UpdateRatingBodySchema>;

export const RatingResponseSchema = RatingSchema;
export type RatingResponse = Rating;

export const RatingListResponseSchema = z.object({
  data: z.array(RatingSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type RatingListResponse = z.infer<typeof RatingListResponseSchema>;

export const RatingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderId: z.string().cuid().optional(),
  runnerId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
});

export type RatingListQuery = z.infer<typeof RatingListQuerySchema>;
