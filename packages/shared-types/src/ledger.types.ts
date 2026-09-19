import { z } from 'zod';

export const LEDGER_ENTRY_TYPES = [
  'ORDER_FEE_TOTAL',
  'RUNNER_SHARE',
  'PLATFORM_SHARE',
  'SETTLEMENT_PAID',
  'ADMIN_ADJUSTMENT',
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(LEDGER_ENTRY_TYPES).optional(),
  runnerId: z.string().trim().min(1).optional(),
  orderId: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type LedgerQuery = z.infer<typeof LedgerQuerySchema>;

export const CreateLedgerEntrySchema = z.object({
  orderId: z.string().trim().min(1).optional(),
  runnerId: z.string().trim().min(1).optional(),
  type: z.enum(LEDGER_ENTRY_TYPES),
  amount: z.number().int().min(1, 'Amount must be positive'),
  description: z.string().trim().min(1, 'Description is required'),
  meta: z.record(z.unknown()).optional(),
});

export type CreateLedgerEntryRequest = z.infer<typeof CreateLedgerEntrySchema>;

export const LedgerEntrySchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  runnerId: z.string().nullable(),
  type: z.enum(LEDGER_ENTRY_TYPES),
  amount: z.number().int(),
  description: z.string(),
  meta: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const LedgerListResponseSchema = z.object({
  data: z.array(LedgerEntrySchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type LedgerEntryListResult = z.infer<typeof LedgerListResponseSchema>;
