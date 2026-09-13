import { z } from 'zod';

export const CloseSettlementSchema = z.object({
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD').refine(
    (val) => {
      const [year, month, day] = val.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
    },
    'Invalid date: components do not form a valid UTC date',
  ),
  runnerId: z.string().trim().min(1, 'runnerId cannot be empty'),
  notes: z.string().nullable(),
});

export type CloseSettlementRequest = z.infer<typeof CloseSettlementSchema>;
