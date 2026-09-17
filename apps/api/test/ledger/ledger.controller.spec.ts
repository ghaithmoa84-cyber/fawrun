import { beforeEach, describe, it, expect, vi } from 'vitest';
import { LedgerQuerySchema, type LedgerQuery } from '@fawrun/shared-types';
import { LedgerController } from '../../src/modules/ledger/ledger.controller.js';
import { LedgerService } from '../../src/modules/ledger/ledger.service.js';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';
import { BadRequestException } from '@nestjs/common';

describe('LedgerController', () => {
  let controller: LedgerController;
  let ledgerService: LedgerService;

  beforeEach(() => {
    ledgerService = {
      listAdminEntries: vi.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
    } as unknown as LedgerService;
    controller = new LedgerController(ledgerService);
  });

  // ── listAdmin ────────────────────────────────────────────
  describe('listAdmin', () => {
    it('validates query params with LedgerQuerySchema', async () => {
      const validQuery: Record<string, string> = {
        page: '1',
        limit: '20',
      };

      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      const parsed = pipe.transform(validQuery, {} as Parameters<ZodValidationPipe['transform']>[1]);

      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
    });

    it('rejects invalid page numbers', () => {
      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      expect(() =>
        pipe.transform({ page: '0' }, {} as Parameters<ZodValidationPipe['transform']>[1]),
      ).toThrow(BadRequestException);
    });

    it('rejects limit exceeding max', () => {
      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      expect(() =>
        pipe.transform({ limit: '101' }, {} as Parameters<ZodValidationPipe['transform']>[1]),
      ).toThrow(BadRequestException);
    });

    it('rejects invalid type filter', () => {
      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      expect(() =>
        pipe.transform({ type: 'INVALID_TYPE' }, {} as Parameters<ZodValidationPipe['transform']>[1]),
      ).toThrow(BadRequestException);
    });

    it('accepts valid type filter', () => {
      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      const parsed = pipe.transform(
        { type: 'ORDER_FEE_TOTAL' },
        {} as Parameters<ZodValidationPipe['transform']>[1],
      );
      expect(parsed.type).toBe('ORDER_FEE_TOTAL');
    });

    it('accepts date range filters', () => {
      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      const parsed = pipe.transform(
        { dateFrom: '2026-09-01', dateTo: '2026-09-30' },
        {} as Parameters<ZodValidationPipe['transform']>[1],
      );
      expect(parsed.dateFrom).toBeInstanceOf(Date);
      expect(parsed.dateTo).toBeInstanceOf(Date);
    });

    it('returns default pagination values when omitted', () => {
      const pipe = new ZodValidationPipe(LedgerQuerySchema);
      const parsed = pipe.transform({}, {} as Parameters<ZodValidationPipe['transform']>[1]);
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
    });

    it('delegates to service with parsed query', async () => {
      const query: LedgerQuery = { page: 1, limit: 20 };

      await controller.listAdmin(query);

      expect(ledgerService.listAdminEntries).toHaveBeenCalledWith(query);
    });

    it('returns paginated result from service', async () => {
      const mockResult = {
        data: [
          {
            id: 'le-1',
            orderId: 'order-1',
            runnerId: null,
            type: 'ORDER_FEE_TOTAL',
            amount: 6000,
            description: 'Test',
            meta: null,
            createdAt: new Date(),
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      ledgerService.listAdminEntries.mockResolvedValueOnce(mockResult);

      const result = await controller.listAdmin({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual(mockResult.meta);
    });
  });

  // ── Controller structure ──────────────────────────────────
  describe('controller structure', () => {
    it('has listAdmin method', () => {
      expect(typeof controller.listAdmin).toBe('function');
    });

    it('is instantiated correctly', () => {
      expect(controller).toBeInstanceOf(LedgerController);
    });
  });
});
