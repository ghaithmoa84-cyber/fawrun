import { z } from "zod";
import { passwordSchema, PhoneE164Schema } from "./auth.types.js";

export const RunnerStatusUpdateSchema = z.object({
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
});

export type RunnerStatusUpdate = z.infer<typeof RunnerStatusUpdateSchema>;

export const RunnerProfileResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  whatsapp: z.string(),
  status: z.enum(["UNAVAILABLE", "AVAILABLE", "ON_MISSION"]),
  isVisible: z.boolean(),
  avgRating: z.number().nullable(),
  totalRatings: z.number(),
  notes: z.string().nullable(),
});

export type RunnerProfileResponse = z.infer<typeof RunnerProfileResponseSchema>;

export const ActiveOrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  customerName: z.string(),
  customerWhatsapp: z.string(),
  deliveryLat: z.number(),
  deliveryLng: z.number(),
  deliveryDesc: z.string(),
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
}).nullable();

export type ActiveOrderResponse = z.infer<typeof ActiveOrderResponseSchema>;

export const CreateRunnerSchema = z.object({
  name: z.string().min(2),
  whatsapp: PhoneE164Schema,
  password: passwordSchema,
  altPhone: PhoneE164Schema.optional(),
});

export type CreateRunnerRequest = z.infer<typeof CreateRunnerSchema>;

export const UpdateRunnerSchema = z.object({
  name: z.string().min(2).optional(),
  altPhone: PhoneE164Schema.optional(),
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
