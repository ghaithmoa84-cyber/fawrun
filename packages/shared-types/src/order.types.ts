import { z } from 'zod';

export const CreateOrderItemSchema = z.object({
  itemName: z.string(),
  quantity: z.string(),
  customStoreName: z.string().nullable(),
  anyStore: z.boolean(),
});

export const DeliveryAddressSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  description: z.string(),
});

export const CreateOrderSchema = z.object({
  items: z.array(CreateOrderItemSchema),
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

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  meta: PaginatedMetaSchema,
});

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};
