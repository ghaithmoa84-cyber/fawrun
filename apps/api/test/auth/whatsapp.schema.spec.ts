import { describe, it, expect } from 'vitest';
import { LoginSchema, RegisterSchema, PhoneE164Schema } from '@fawrun/shared-types';

describe('PhoneE164Schema (F-9: WhatsApp E.164 validation)', () => {
  const valid = ['+963912345678', '+15551234567', '+447911123456', '+995555123456'];
  const invalid = [
    '0912345678', // missing leading + / country code
    '963912345678', // no leading +
    '963-912-345-678', // dashes
    '+963 912 345 678', // internal spaces
    '+0123456789', // country code cannot start with 0
    '', // empty
    '+', // only the plus sign
    '+1234567890123456789', // too long (>15 digits)
  ];

  it.each(valid)('accepts valid E.164 number %s', (phone) => {
    expect(PhoneE164Schema.parse(phone)).toBe(phone);
  });

  it.each(invalid)('rejects invalid whatsapp %s', (phone) => {
    expect(() => PhoneE164Schema.parse(phone)).toThrow();
  });

  it('RegisterSchema.rejected whatsapp when not E.164', () => {
    expect(() =>
      RegisterSchema.parse({
        name: 'Tester',
        whatsapp: '0912345678',
        altPhone: null,
        password: 'password123',
        address: { lat: 0, lng: 0, description: 'home' },
      }),
    ).toThrow();
  });

  it('RegisterSchema accepts E.164 whatsapp and optional E.164 altPhone', () => {
    const dto = RegisterSchema.parse({
      name: 'Tester',
      whatsapp: '+963912345678',
      altPhone: '+963987654321',
      password: 'password123',
      address: { lat: 0, lng: 0, description: 'home' },
    });
    expect(dto.whatsapp).toBe('+963912345678');
    expect(dto.altPhone).toBe('+963987654321');
  });

  it('RegisterSchema rejects non-E.164 altPhone', () => {
    expect(() =>
      RegisterSchema.parse({
        name: 'Tester',
        whatsapp: '+963912345678',
        altPhone: '0987654321',
        password: 'password123',
        address: { lat: 0, lng: 0, description: 'home' },
      }),
    ).toThrow();
  });

  it('LoginSchema rejects non-E.164 whatsapp', () => {
    expect(() =>
      LoginSchema.parse({ whatsapp: '0912345678', password: 'password123' }),
    ).toThrow();
  });

  it('LoginSchema accepts E.164 whatsapp', () => {
    const dto = LoginSchema.parse({ whatsapp: '+963912345678', password: 'password123' });
    expect(dto.whatsapp).toBe('+963912345678');
  });
});
