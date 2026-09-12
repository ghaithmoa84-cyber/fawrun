import { z } from 'zod';

const nonEmptyString = z
  .string()
  .trim()
  .min(1, 'Field cannot be empty or whitespace');

export const CreateOrderItemSchema = z.object({
  itemName: nonEmptyString,
  quantity: nonEmptyString,
  customStoreName: z.string().nullable(),
  anyStore: z.boolean(),
});

export const DeliveryAddressSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  description: z.string(),
});

export const CreateOrderSchema = z.object({
  items: z.array(CreateOrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().nullable(),
  preferredRunnerId: z.string().nullable(),
  waitForPreferred: z.boolean(),
  deliveryAddress: DeliveryAddressSchema,
});

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;

export const EstimatedFeeSchema = z.object({
  baseFee: z.number(),
  peripheralFee: z.number(),
  extraStoresFee: z.number(),
  totalFee: z.number(),
  note: z.string(),
});

export type EstimatedFee = z.infer<typeof EstimatedFeeSchema>;

export const CreateOrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  estimatedFee: EstimatedFeeSchema,
});

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

export const PaginatedMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type PaginatedMeta = z.infer<typeof PaginatedMetaSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginatedMetaSchema,
  });

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};
