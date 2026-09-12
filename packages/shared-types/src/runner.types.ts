import { z } from 'zod';
import { passwordSchema } from './auth.types.js';

export const RunnerStatusUpdateSchema = z.object({
  status: z.enum(['AVAILABLE', 'UNAVAILABLE']),
});

export type RunnerStatusUpdate = z.infer<typeof RunnerStatusUpdateSchema>;

export const CreateRunnerSchema = z.object({
  name: z.string().min(2),
  whatsapp: z.string(),
  password: passwordSchema,
  altPhone: z.string().optional(),
});

export type CreateRunnerRequest = z.infer<typeof CreateRunnerSchema>;

export const UpdateRunnerSchema = z.object({
  name: z.string().min(2).optional(),
  altPhone: z.string().optional(),
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
  notes: z.string().nullable(),
});

export type ApproveOrderRequest = z.infer<typeof ApproveOrderSchema>;

export const AssignRunnerSchema = z.object({
  runnerId: z.string().trim().min(1, 'runnerId cannot be empty'),
});

export type AssignRunnerRequest = z.infer<typeof AssignRunnerSchema>;
