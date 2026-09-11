import { z } from 'zod';

export const CloseSettlementSchema = z.object({
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  notes: z.string().nullable(),
});

export type CloseSettlementRequest = z.infer<typeof CloseSettlementSchema>;
