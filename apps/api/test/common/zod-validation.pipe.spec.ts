import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe.js';

describe('ZodValidationPipe with Arabic ErrorMap', () => {
  const dummyMetadata = { type: 'body' as const, metatype: Object, data: '' };

  const testSchema = z.object({
    name: z.string().min(2),
    role: z.enum(['CUSTOMER', 'RUNNER']),
    age: z.number().max(100),
    email: z.string().email(),
  });

  it('translates invalid_type (undefined / Required) to "هذا الحقل مطلوب"', () => {
    const pipe = new ZodValidationPipe(testSchema);
    expect(() => pipe.transform({}, dummyMetadata)).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining('name: هذا الحقل مطلوب'),
      }),
    );
  });

  it('translates too_small to "القيمة قصيرة جدًا"', () => {
    const pipe = new ZodValidationPipe(testSchema);
    expect(() =>
      pipe.transform(
        { name: 'A', role: 'CUSTOMER', age: 25, email: 'test@example.com' },
        dummyMetadata,
      ),
    ).toThrowError(
      expect.objectContaining({
        message: 'name: القيمة قصيرة جدًا',
      }),
    );
  });

  it('translates too_big to "القيمة طويلة جدًا"', () => {
    const pipe = new ZodValidationPipe(testSchema);
    expect(() =>
      pipe.transform(
        { name: 'Ahmad', role: 'CUSTOMER', age: 101, email: 'test@example.com' },
        dummyMetadata,
      ),
    ).toThrowError(
      expect.objectContaining({
        message: 'age: القيمة طويلة جدًا',
      }),
    );
  });

  it('translates invalid_enum_value to "قيمة غير مسموحة"', () => {
    const pipe = new ZodValidationPipe(testSchema);
    expect(() =>
      pipe.transform(
        { name: 'Ahmad', role: 'SUPERUSER', age: 25, email: 'test@example.com' },
        dummyMetadata,
      ),
    ).toThrowError(
      expect.objectContaining({
        message: 'role: قيمة غير مسموحة',
      }),
    );
  });

  it('translates invalid_string to "صيغة غير صحيحة"', () => {
    const pipe = new ZodValidationPipe(testSchema);
    expect(() =>
      pipe.transform(
        { name: 'Ahmad', role: 'CUSTOMER', age: 25, email: 'invalid-email' },
        dummyMetadata,
      ),
    ).toThrowError(
      expect.objectContaining({
        message: 'email: صيغة غير صحيحة',
      }),
    );
  });

  it('formats multiple errors in "path: message" format separated by comma', () => {
    const pipe = new ZodValidationPipe(testSchema);
    try {
      pipe.transform({ name: 'A', age: 150 }, dummyMetadata);
      expect.unreachable('Should have thrown BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const ex = err as BadRequestException;
      const res = ex.getResponse() as Record<string, unknown>;
      expect(res.message).toBe(
        'name: القيمة قصيرة جدًا, role: هذا الحقل مطلوب, age: القيمة طويلة جدًا, email: هذا الحقل مطلوب',
      );
    }
  });

  it('passes valid data without alteration', () => {
    const pipe = new ZodValidationPipe(testSchema);
    const validData = {
      name: 'Ahmad',
      role: 'CUSTOMER',
      age: 25,
      email: 'test@example.com',
    };
    const result = pipe.transform(validData, dummyMetadata);
    expect(result).toEqual(validData);
  });
});
