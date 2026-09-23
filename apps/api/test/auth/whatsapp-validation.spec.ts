import { describe, expect, it } from 'vitest';
import {
  CreateRunnerSchema,
  LoginSchema,
  PhoneE164Schema,
  RegisterSchema,
} from '@fawrun/shared-types';

describe('F-9: WhatsApp Syrian local validation (shared Zod schemas)', () => {
  describe('PhoneE164Schema', () => {
    it.each([
      '0912345678',
      '0991234567',
      '0987654321',
    ])('accepts valid Syrian number %s', (value) => {
      expect(PhoneE164Schema.parse(value)).toBe(value);
    });

    it.each([
      ['missing leading 0', '912345678'],
      ['international format', '+963912345678'],
      ['internal whitespace', '091234 5678'],
      ['dashes', '0912-345-678'],
      ['too many digits', '09123456789'],
      ['no country code', '12345678'],
      ['empty', ''],
    ])('rejects invalid number: %s', (_label, value) => {
      expect(() => PhoneE164Schema.parse(value)).toThrow();
    });
  });

  describe('RegisterSchema', () => {
    const base = {
      name: 'Test User',
      password: 'securePass123',
      altPhone: null,
      address: { lat: 33.5, lng: 36.6, description: 'Damascus' },
    };

    it('accepts a Syrian whatsapp', () => {
      expect(RegisterSchema.parse({ ...base, whatsapp: '0912345678' }).whatsapp).toBe(
        '0912345678',
      );
    });

    it('rejects an international whatsapp', () => {
      expect(() => RegisterSchema.parse({ ...base, whatsapp: '+963912345678' })).toThrow();
    });

    it('rejects whatsapp with internal whitespace', () => {
      expect(() =>
        RegisterSchema.parse({ ...base, whatsapp: '091234 5678' }),
      ).toThrow();
    });
  });

  describe('LoginSchema', () => {
    it('accepts a Syrian whatsapp', () => {
      expect(
        LoginSchema.parse({
          whatsapp: '0912345678',
          password: 'securePass123',
        }).whatsapp,
      ).toBe('0912345678');
    });

    it('rejects an international whatsapp', () => {
      expect(() =>
        LoginSchema.parse({ whatsapp: '+963912345678', password: 'securePass123' }),
      ).toThrow();
    });
  });

  describe('CreateRunnerSchema', () => {
    const base = {
      name: 'Runner One',
      password: 'securePass123',
    };

    it('accepts a Syrian whatsapp', () => {
      expect(CreateRunnerSchema.parse({ ...base, whatsapp: '0912345678' }).whatsapp).toBe(
        '0912345678',
      );
    });

    it('accepts a Syrian altPhone when provided', () => {
      expect(
        CreateRunnerSchema.parse({
          ...base,
          whatsapp: '0912345678',
          altPhone: '0987654321',
        }).altPhone,
      ).toBe('0987654321');
    });

    it('rejects an international whatsapp', () => {
      expect(() => CreateRunnerSchema.parse({ ...base, whatsapp: '+963912345678' })).toThrow();
    });

    it('rejects a non-Syrian altPhone when provided', () => {
      expect(() =>
        CreateRunnerSchema.parse({
          ...base,
          whatsapp: '0912345678',
          altPhone: '912-345',
        }),
      ).toThrow();
    });
  });
});