import { z } from "zod";
import { passwordSchema, SyrianPhoneSchema } from "./auth.types.js";

const nonEmptyString = z
  .string()
  .trim()
  .min(1, "Field cannot be empty or whitespace");

export const RunnerStatusUpdateSchema = z.object({
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
});

export type RunnerStatusUpdate = z.infer<typeof RunnerStatusUpdateSchema>;

export const RunnerProfileResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  whatsapp: z.string(),
  altPhone: z.string().nullable(),
  status: z.enum(["UNAVAILABLE", "AVAILABLE", "ON_MISSION"]),
  isVisible: z.boolean(),
  avgRating: z.number().nullable(),
  totalRatings: z.number(),
  notes: z.string().nullable(),
});

export type RunnerProfileResponse = z.infer<typeof RunnerProfileResponseSchema>;

export const ActiveOrderDeliveryAddressSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  description: z.string(),
});

export const ActiveOrderPricingSchema = z.object({
  baseFee: z.number(),
  peripheralFee: z.number(),
  extraStoresFee: z.number(),
  totalFee: z.number(),
});

export const ActiveOrderStoreItemSchema = z.object({
  id: z.string(),
  itemName: z.string(),
  quantity: z.string(),
  customStoreName: z.string().nullable(),
  anyStore: z.boolean(),
});

export type ActiveOrderStoreItem = z.infer<typeof ActiveOrderStoreItemSchema>;

export const ActiveOrderStoreReceiptSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  isDeleted: z.boolean(),
  uploadedAt: z.string(),
});

export type ActiveOrderStoreReceipt = z.infer<typeof ActiveOrderStoreReceiptSchema>;

export const ActiveOrderStoreSchema = z.object({
  id: z.string(),
  storeName: z.string(),
  isAnyStore: z.boolean(),
  status: z.string(),
  isExtra: z.boolean(),
  addedBy: z.string().nullable(),
  purchasedAt: z.string().nullable(),
  items: z.array(ActiveOrderStoreItemSchema),
  receipts: z.array(ActiveOrderStoreReceiptSchema),
});

export type ActiveOrderStore = z.infer<typeof ActiveOrderStoreSchema>;

export const ActiveOrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  customerName: z.string(),
  customerWhatsapp: z.string(),
  deliveryAddress: ActiveOrderDeliveryAddressSchema,
  pricing: ActiveOrderPricingSchema,
  totalFee: z.number(),
  isPeripheral: z.boolean(),
  createdAt: z.string(),
  assignedAt: z.string().nullable(),
  items: z.array(z.object({
    id: z.string(),
    itemName: z.string(),
    quantity: z.string(),
    customStoreName: z.string().nullable(),
    anyStore: z.boolean(),
  })),
  orderStores: z.array(ActiveOrderStoreSchema),
}).nullable();

export type ActiveOrderResponse = z.infer<typeof ActiveOrderResponseSchema>;

export const CreateRunnerSchema = z.object({
  name: nonEmptyString.min(2, "Name must be at least 2 characters"),
  whatsapp: SyrianPhoneSchema,
  password: passwordSchema,
  altPhone: SyrianPhoneSchema.optional(),
});

export type CreateRunnerRequest = z.infer<typeof CreateRunnerSchema>;

export const UpdateRunnerSchema = z.object({
  name: nonEmptyString.min(2, "Name must be at least 2 characters").optional(),
  altPhone: SyrianPhoneSchema.optional(),
  notes: z.string().optional(),
  password: passwordSchema.optional(),
});

export type UpdateRunnerRequest = z.infer<typeof UpdateRunnerSchema>;

export const UpdateVisibilitySchema = z.object({
  isVisible: z.boolean(),
});

export type UpdateVisibilityRequest = z.infer<typeof UpdateVisibilitySchema>;

export type PurchaseResponse = {
  orderStore: {
    id: string;
    status: string;
  };
  updatedFee: {
    extraStoresFee: number;
    totalFee: number;
  };
  customerNotified: boolean;
};

export const ApproveOrderSchema = z.object({
  isPeripheral: z.boolean(),
  notes: z.string().nullable().optional(),
});

export type ApproveOrderRequest = z.infer<typeof ApproveOrderSchema>;

export const AssignRunnerSchema = z.object({
  runnerId: z.string().trim().min(1, "runnerId cannot be empty"),
});

export type AssignRunnerRequest = z.infer<typeof AssignRunnerSchema>;
