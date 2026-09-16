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

export type LedgerEntry = {
  id: string;
  orderId: string | null;
  runnerId: string | null;
  type: LedgerEntryType;
  amount: number;
  description: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};

export type LedgerEntryListResult = {
  data: LedgerEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
