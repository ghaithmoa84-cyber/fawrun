import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z, ZodErrorMap, ZodSchema } from 'zod';

export const arabicErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        return { message: 'هذا الحقل مطلوب' };
      }
      return { message: 'نوع البيانات غير صالح' };

    case z.ZodIssueCode.too_small:
      return { message: 'القيمة قصيرة جدًا' };

    case z.ZodIssueCode.too_big:
      return { message: 'القيمة طويلة جدًا' };

    case z.ZodIssueCode.invalid_string:
      return { message: 'صيغة غير صحيحة' };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'قيمة غير مسموحة' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'تاريخ غير صالح' };

    case z.ZodIssueCode.custom:
      return { message: ctx.defaultError || 'قيمة غير صالحة' };

    default:
      return { message: ctx.defaultError || 'بيانات غير صالحة' };
  }
};

z.setErrorMap(arabicErrorMap);

const ENGLISH_FALLBACK_MESSAGES: Record<string, string> = {
  'Required': 'هذا الحقل مطلوب',
  'Phone number is required': 'رقم الهاتف مطلوب',
  'WhatsApp number must be in Syrian format (e.g. 0912345678)': 'رقم الواتساب يجب أن يكون بالصيغة السورية (مثال: 0912345678)',
  'Password must not exceed 72 bytes': 'كلمة المرور يجب ألا تتجاوز 72 بايت',
};

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((err) => {
          const rawMessage = err.message;
          const localizedMessage = ENGLISH_FALLBACK_MESSAGES[rawMessage] ?? rawMessage;
          const path = err.path.join('.');
          return path ? `${path}: ${localizedMessage}` : localizedMessage;
        })
        .join(', ');
      throw new BadRequestException(errorMessages);
    }
    return result.data;
  }
}

