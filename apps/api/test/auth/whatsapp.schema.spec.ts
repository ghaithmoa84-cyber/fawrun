import { describe, it, expect } from 'vitest';
import { LoginSchema, RegisterSchema, PhoneE164Schema } from '@fawrun/shared-types';

describe('PhoneE164Schema (Syria local format: 09XXXXXXXX)', () => {
  const valid = ['0912345678', '0991234567', '0987654321'];
  const invalid = [
    '+963912345678', // international format no longer accepted
    '963912345678', // no leading 0
    '912345678', // too short (9 digits)
    '091234567', // too short (9 digits)
    '09123456789', // too long (11 digits)
    '+963 912 345 678', // internal spaces
    '0963-912-345-678', // dashes
    '0123456789', // does not start with 09
    '', // empty
  ];

  it.each(valid)('accepts valid Syrian number %s', (phone) => {
    expect(PhoneE164Schema.parse(phone)).toBe(phone);
  });

  it.each(invalid)('rejects invalid whatsapp %s', (phone) => {
    expect(() => PhoneE164Schema.parse(phone)).toThrow();
  });

  it('RegisterSchema rejects international whatsapp', () => {
    expect(() =>
      RegisterSchema.parse({
        name: 'Tester',
        whatsapp: '+963912345678',
        altPhone: null,
        password: 'password123',
        address: { lat: 0, lng: 0, description: 'home' },
      }),
    ).toThrow();
  });

  it('RegisterSchema accepts Syrian whatsapp and optional Syrian altPhone', () => {
    const dto = RegisterSchema.parse({
      name: 'Tester',
      whatsapp: '0912345678',
      altPhone: '0987654321',
      password: 'password123',
      address: { lat: 0, lng: 0, description: 'home' },
    });
    expect(dto.whatsapp).toBe('0912345678');
    expect(dto.altPhone).toBe('0987654321');
  });

  it('RegisterSchema accepts registration without altPhone', () => {
    const dto = RegisterSchema.parse({
      name: 'Tester',
      whatsapp: '0912345678',
      password: 'password123',
      address: { lat: 0, lng: 0, description: 'home' },
    });
    expect(dto.whatsapp).toBe('0912345678');
    expect(dto.altPhone).toBeUndefined();
  });

  it('RegisterSchema rejects non-Syrian altPhone', () => {
    expect(() =>
      RegisterSchema.parse({
        name: 'Tester',
        whatsapp: '0912345678',
        altPhone: '+963987654321',
        password: 'password123',
        address: { lat: 0, lng: 0, description: 'home' },
      }),
    ).toThrow();
  });

  it('LoginSchema rejects international whatsapp', () => {
    expect(() =>
      LoginSchema.parse({ whatsapp: '+963912345678', password: 'password123' }),
    ).toThrow();
  });

  it('LoginSchema accepts Syrian whatsapp', () => {
    const dto = LoginSchema.parse({ whatsapp: '0912345678', password: 'password123' });
    expect(dto.whatsapp).toBe('0912345678');
  });
});