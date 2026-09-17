import { describe, expect, it } from 'vitest';
import {
  CreateRunnerSchema,
  LoginSchema,
  PhoneE164Schema,
  RegisterSchema,
} from '@fawrun/shared-types';

describe('F-9: WhatsApp E.164 validation (shared Zod schemas)', () => {
  describe('PhoneE164Schema', () => {
    it.each([
      '+963912345678',
      '+14155552671',
      '+966501234567',
      '+447700900000',
    ])('accepts valid E.164 number %s', (value) => {
      expect(PhoneE164Schema.parse(value)).toBe(value);
    });

    it.each([
      ['missing leading +', '0912345678'],
      ['internal whitespace', '+963912 345678'],
      ['dashes', '+963-912-345-678'],
      ['too many digits (>15)', '+9639123456789012345678'],
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

    it('accepts an E.164 whatsapp', () => {
      expect(RegisterSchema.parse({ ...base, whatsapp: '+963912345678' }).whatsapp).toBe(
        '+963912345678',
      );
    });

    it('rejects a non-E.164 whatsapp', () => {
      expect(() => RegisterSchema.parse({ ...base, whatsapp: '0912345678' })).toThrow();
    });

    it('rejects whatsapp with internal whitespace', () => {
      expect(() =>
        RegisterSchema.parse({ ...base, whatsapp: '+963912 345678' }),
      ).toThrow();
    });
  });

  describe('LoginSchema', () => {
    it('accepts an E.164 whatsapp', () => {
      expect(
        LoginSchema.parse({
          whatsapp: '+963912345678',
          password: 'securePass123',
        }).whatsapp,
      ).toBe('+963912345678');
    });

    it('rejects a local-format whatsapp', () => {
      expect(() =>
        LoginSchema.parse({ whatsapp: '0912345678', password: 'securePass123' }),
      ).toThrow();
    });
  });

  describe('CreateRunnerSchema', () => {
    const base = {
      name: 'Runner One',
      password: 'securePass123',
    };

    it('accepts an E.164 whatsapp', () => {
      expect(CreateRunnerSchema.parse({ ...base, whatsapp: '+963912345678' }).whatsapp).toBe(
        '+963912345678',
      );
    });

    it('accepts an E.164 altPhone when provided', () => {
      expect(
        CreateRunnerSchema.parse({
          ...base,
          whatsapp: '+963912345678',
          altPhone: '+966501234567',
        }).altPhone,
      ).toBe('+966501234567');
    });

    it('rejects a non-E.164 whatsapp', () => {
      expect(() => CreateRunnerSchema.parse({ ...base, whatsapp: '0912345678' })).toThrow();
    });

    it('rejects a non-E.164 altPhone when provided', () => {
      expect(() =>
        CreateRunnerSchema.parse({
          ...base,
          whatsapp: '+963912345678',
          altPhone: '912-345',
        }),
      ).toThrow();
    });
  });
});
